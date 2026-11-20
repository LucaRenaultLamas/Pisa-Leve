import type { Coordenadas } from '@/services/localizacao';
import { pontoMaisPerto, salvarTrilhasOsm, type Area, type Trilha } from '@/services/trilhas';
import { distanciaKm } from '@/utils/geo';

// Servidores públicos e voluntários: vivem lotados, então tem mais de um.
// Ordem pela medição de 20/11: Mail.ru 24 s; overpass-api.de 502 na hora; os outros > 90 s
const SERVIDORES = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
// Em 20/11 uma resposta boa levou 26-37 s; com menos que isso desistia cedo demais
const TEMPO_LIMITE_MS = 40_000;
// Se o servidor não responder nesse tempo, já chama o próximo junto
const ESPERA_PROXIMO_MS = 4_000;
// Pontos mais perto que isso viram um só; a lista e o cache ficam leves
const PASSO_MINIMO_KM = 0.025;

export class ErroTrilhas extends Error {
  // fora = OpenStreetMap fora do ar ou lotado; internet = o aparelho está sem rede
  tipo: 'fora' | 'internet';

  constructor(tipo: 'fora' | 'internet') {
    super(
      tipo === 'fora'
        ? 'Os servidores de trilhas do OpenStreetMap não estão respondendo agora. Não é problema no seu aparelho: tente de novo em alguns minutos.'
        : 'Sem conexão com a internet. Confira o Wi-Fi ou os dados móveis.',
    );
    this.name = 'ErroTrilhas';
    this.tipo = tipo;
  }
}

class FalhaDeRede extends Error {}

type PontoApi = { lat: number; lon: number } | null;

type ElementoApi = {
  type: 'relation' | 'way';
  id: number;
  tags?: Record<string, string>;
  members?: { type: string; geometry?: PontoApi[] }[]; // relação
  geometry?: PontoApi[]; // caminho solto
};

type RespostaOverpass = {
  elements: ElementoApi[];
  remark?: string;
};

async function consultar(servidor: string, consulta: string, cancelar: AbortSignal) {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  const aoCancelar = () => controle.abort();
  cancelar.addEventListener('abort', aoCancelar);

  let resposta: Response;
  try {
    resposta = await fetch(servidor, {
      method: 'POST',
      signal: controle.signal,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(consulta)}`,
    });
  } catch (erro) {
    if (erro instanceof Error && erro.name === 'AbortError') throw new ErroTrilhas('fora');
    // Na web, servidor caído sem CORS também cai aqui; quem decide é temInternet()
    throw new FalhaDeRede();
  } finally {
    clearTimeout(relogio);
    cancelar.removeEventListener('abort', aoCancelar);
  }

  if (!resposta.ok) throw new ErroTrilhas('fora');
  const dados = (await resposta.json().catch(() => null)) as RespostaOverpass | null;
  // A Overpass responde 200 com "remark" quando estoura o tempo dela
  if (!dados || (dados.remark && dados.elements.length === 0)) throw new ErroTrilhas('fora');
  return dados;
}

// Qualquer resposta do iNaturalist prova que a internet está ok
async function temInternet() {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), 5_000);
  try {
    await fetch('https://api.inaturalist.org/v1/taxa?per_page=0', { signal: controle.signal });
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(relogio);
  }
}

// Começa por um servidor e vai chamando os outros aos poucos; vale a 1ª resposta boa
function consultarServidores(consulta: string): Promise<RespostaOverpass> {
  const cancelar = new AbortController();

  return new Promise((resolver, rejeitar) => {
    let disparados = 0;
    let falhas = 0;
    let soRede = true;
    let terminou = false; // cancelar os perdedores também cai no erro; não conta
    let relogio: ReturnType<typeof setTimeout> | undefined;

    async function desistir() {
      terminou = true;
      if (soRede && !(await temInternet())) rejeitar(new ErroTrilhas('internet'));
      else rejeitar(new ErroTrilhas('fora'));
    }

    function disparar() {
      clearTimeout(relogio);
      if (terminou || disparados === SERVIDORES.length) return;
      const servidor = SERVIDORES[disparados++];
      relogio = setTimeout(disparar, ESPERA_PROXIMO_MS);

      consultar(servidor, consulta, cancelar.signal).then(
        (dados) => {
          if (terminou) return;
          terminou = true;
          clearTimeout(relogio);
          cancelar.abort();
          resolver(dados);
        },
        (erro) => {
          if (terminou) return;
          if (!(erro instanceof FalhaDeRede)) soRede = false;
          falhas++;
          if (falhas === SERVIDORES.length) desistir();
          else disparar();
        },
      );
    }

    disparar();
  });
}

// O servidor manda null onde o caminho sai da área: cada pedaço vira um trecho
function separarTrechos(pontos: PontoApi[]) {
  const trechos: Coordenadas[][] = [];
  let atual: Coordenadas[] = [];
  for (const p of pontos) {
    if (!p) {
      if (atual.length >= 2) trechos.push(atual);
      atual = [];
      continue;
    }
    const ponto = { latitude: p.lat, longitude: p.lon };
    const anterior = atual[atual.length - 1];
    if (!anterior || distanciaKm(anterior, ponto) >= PASSO_MINIMO_KM) atual.push(ponto);
  }
  if (atual.length >= 2) trechos.push(atual);
  return trechos;
}

function comprimentoDosTrechos(trechos: Coordenadas[][]) {
  let total = 0;
  for (const trecho of trechos) {
    for (let i = 1; i < trecho.length; i++) total += distanciaKm(trecho[i - 1], trecho[i]);
  }
  return total;
}

// A tag "distance" vem em km, às vezes com vírgula ou " km" no fim
function lerDistancia(valor: string | undefined) {
  const km = valor ? parseFloat(valor.replace(',', '.')) : NaN;
  return Number.isFinite(km) && km > 0 ? km : null;
}

type Busca = {
  chave: string; // nome da lista salva no aparelho
  area: Area;
  referencia: Coordenadas; // de onde contam as distâncias
  raioKm: number | null; // null = vale a área inteira (cidade)
};

type Pedaco = {
  id: number;
  soCaminho: boolean; // veio de caminho solto, não de relação
  tags: Record<string, string>;
  caminhos: (PontoApi[] | undefined)[];
};

export async function buscarTrilhasOsm({ chave, area, referencia, raioKm }: Busca) {
  // Retângulo é bem mais leve pro servidor que "around"; o raio é conferido aqui
  const caixa = [area.sul, area.oeste, area.norte, area.leste].map((n) => n.toFixed(5)).join(',');
  // Por aqui quase ninguém cadastra a trilha como rota: também vale caminho com nome de trilha.
  // Os calçados ficam de fora (passarela de concreto chamada "Travessia" não é trilha)
  const nome =
    '["name"~"^(trilha|caminho|travessia|picada)",i]["surface"!~"^(asphalt|concrete|concrete:plates|paving_stones|sett)$"]';
  // Valor exato em cada tipo usa o índice do servidor (regex no valor não usa): 36 s -> 27 s em JF.
  // "qt" devolve sem ordenar, que é mais rápido
  const consulta = `[out:json][timeout:40][bbox:${caixa}];
(
  relation["route"="hiking"];
  relation["route"="foot"];
  relation["route"="walking"];
  way["highway"="path"]${nome};
  way["highway"="track"]${nome};
  way["highway"="footway"]${nome};
  way["highway"="bridleway"]${nome};
);
out tags geom(${caixa}) qt;`;

  const resposta = await consultarServidores(consulta);

  // Uma trilha costuma vir picada em vários caminhos com o mesmo nome: junta tudo
  const pedacos: Pedaco[] = [];
  const porNome = new Map<string, Pedaco>();
  for (const el of resposta.elements) {
    const tags = el.tags ?? {};
    if (el.type === 'relation') {
      const caminhos = (el.members ?? []).filter((m) => m.type === 'way').map((m) => m.geometry);
      pedacos.push({ id: el.id, soCaminho: false, tags, caminhos });
      continue;
    }
    const nome = (tags.name ?? '').trim().toLowerCase();
    const existente = porNome.get(nome);
    if (existente) {
      existente.caminhos.push(el.geometry);
      // Menor id do grupo: não depende da ordem da resposta e bate com a busca rápida
      existente.id = Math.min(existente.id, el.id);
    } else {
      const novo = { id: el.id, soCaminho: true, tags, caminhos: [el.geometry] };
      porNome.set(nome, novo);
      pedacos.push(novo);
    }
  }

  const trilhas = pedacos.flatMap((p): Trilha[] => {
    const trechos = p.caminhos.flatMap((g) => (g ? separarTrechos(g) : []));
    if (trechos.length === 0) return [];

    const inicio = trechos[0][0];
    const distancia = pontoMaisPerto(referencia, { trechos, inicio });
    if (raioKm !== null && distancia > raioKm) return [];

    const { tags } = p;
    const rotaLonga = p.caminhos.some((g) => !g || g.includes(null));
    return [
      {
        // "w" na frente: caminho e relação podem ter o mesmo número
        id: p.soCaminho ? `w${p.id}` : String(p.id),
        origem: 'osm',
        nome: tags.name ?? tags['name:pt'] ?? tags.ref ?? 'Trilha sem nome',
        de: tags.from ?? null,
        para: tags.to ?? null,
        descricao: null,
        trechos,
        inicio,
        comprimentoKm:
          lerDistancia(tags.distance) ?? (rotaLonga ? null : comprimentoDosTrechos(trechos)),
        rotaLonga,
        distanciaKm: distancia,
      },
    ];
  });

  await salvarTrilhasOsm(chave, trilhas);
  return trilhas;
}
