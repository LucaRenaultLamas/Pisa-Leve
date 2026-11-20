import { Platform } from 'react-native';

import type { Coordenadas } from '@/services/localizacao';
import { pontoMaisPerto, type Area, type Trilha } from '@/services/trilhas';
import { distanciaKm } from '@/utils/geo';

// Busca por nome no OpenStreetMap: ~0,3 s por termo, contra 25-90 s da Overpass (20/11).
// Não acha rotas cadastradas como relação nem traz tudo: serve pra lista aparecer logo
const API = 'https://nominatim.openstreetmap.org/search';
const TERMOS = ['trilha', 'travessia', 'caminho', 'picada'];
const ESPERA_ENTRE_MS = 1_100; // regra do Nominatim: no máximo 1 pedido por segundo
const TEMPO_LIMITE_MS = 8_000;
const PASSO_MINIMO_KM = 0.025;
const TIPOS = new Set(['path', 'track', 'footway', 'bridleway']);
const NOME = /^(trilha|caminho|travessia|picada)/i;
const CALCADO = /^(asphalt|concrete|concrete:plates|paving_stones|sett)$/;

type LinhaApi = [number, number][];

type ResultadoApi = {
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  category: string;
  type: string;
  name: string;
  lat: string;
  lon: string;
  boundingbox?: [string, string, string, string]; // sul, norte, oeste, leste
  address?: Record<string, string>;
  extratags?: Record<string, string> | null;
  geojson?:
    | { type: 'LineString'; coordinates: LinhaApi }
    | { type: 'MultiLineString'; coordinates: LinhaApi[] }
    | { type: string };
};

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

// Todos os pedidos do app passam por esta fila. Busca de trilhas (alta) passa na frente
// da conferência de cidades (baixa), que pode somar dezenas de pedidos
type Prioridade = 'alta' | 'baixa';
const filas: Record<Prioridade, (() => Promise<void>)[]> = { alta: [], baixa: [] };
let andando = false;

async function andarFila() {
  if (andando) return;
  andando = true;
  while (filas.alta.length > 0 || filas.baixa.length > 0) {
    const proximo = filas.alta.shift() ?? filas.baixa.shift()!;
    await proximo();
    await esperar(ESPERA_ENTRE_MS);
  }
  andando = false;
}

function naFila<T>(prioridade: Prioridade, pedido: () => Promise<T>): Promise<T> {
  return new Promise<T>((resolver, rejeitar) => {
    filas[prioridade].push(() => pedido().then(resolver, rejeitar));
    andarFila();
  });
}

// No celular o fetch não manda Referer; o Nominatim pede que o app se identifique
const CABECALHOS: Record<string, string> =
  Platform.OS === 'web' ? {} : { 'User-Agent': 'PisaLeve/1.0 (trabalho academico, Expo)' };

// Com desenho = busca de trilhas que a pessoa espera (alta); sem = procura de cidades (baixa)
function buscarTermo(termo: string, area: Area, comDesenho = true) {
  const params: Record<string, string> = {
    q: termo,
    viewbox: `${area.oeste},${area.norte},${area.leste},${area.sul}`,
    bounded: '1',
    extratags: '1',
    limit: '40',
    ...(comDesenho
      ? { polygon_geojson: '1', polygon_threshold: '0.0001' }
      : { addressdetails: '1' }),
  };
  return naFila(comDesenho ? 'alta' : 'baixa', () => pedir(params));
}

async function pedir(extras: Record<string, string>) {
  const params = new URLSearchParams({ format: 'jsonv2', ...extras });
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(`${API}?${params}`, {
      signal: controle.signal,
      headers: CABECALHOS,
    });
    if (!resposta.ok) throw new Error(`Nominatim ${resposta.status}`);
    return (await resposta.json()) as ResultadoApi[];
  } finally {
    clearTimeout(relogio);
  }
}

// Mesmo critério da consulta da Overpass
function ehTrilha(r: ResultadoApi) {
  const tags = r.extratags ?? {};
  return (
    r.osm_type === 'way' &&
    r.category === 'highway' &&
    TIPOS.has(r.type) &&
    NOME.test(r.name) &&
    !CALCADO.test(tags.surface ?? '')
  );
}

export type TrilhaNaRegiao = {
  municipio: string;
  estado: string | null;
  uf: string | null;
  ponto: Coordenadas;
};

// Trilhas numa região grande, só com o município de cada uma (sem desenho: resposta leve)
export async function buscarTrilhasNaRegiao(area: Area): Promise<TrilhaNaRegiao[]> {
  const achadas: TrilhaNaRegiao[] = [];
  let respostas = 0;
  for (const termo of TERMOS) {
    const resultados = await buscarTermo(termo, area, false).catch(() => null);
    if (!resultados) continue;
    respostas++;
    for (const r of resultados) {
      const endereco = r.address ?? {};
      const municipio = endereco.municipality ?? endereco.city ?? endereco.town ?? endereco.village;
      if (!ehTrilha(r) || !municipio) continue;
      achadas.push({
        municipio,
        estado: endereco.state ?? null,
        uf: endereco['ISO3166-2-lvl4']?.replace('BR-', '') ?? null,
        ponto: { latitude: Number(r.lat), longitude: Number(r.lon) },
      });
    }
  }
  if (respostas === 0) throw new Error('Nominatim fora do ar');
  return achadas;
}

export type Municipio = {
  id: number;
  nome: string;
  uf: string | null;
  centro: Coordenadas;
  area: Area;
};

// Contorno (caixa) do município, pra busca de trilhas da cidade
export async function buscarMunicipio(
  nome: string,
  estado: string | null,
  uf: string | null,
): Promise<Municipio | null> {
  const [r] = await naFila('baixa', () =>
    pedir({
      city: nome,
      ...(estado ? { state: estado } : {}),
      country: 'Brasil',
      featureType: 'city',
      limit: '1',
    }),
  );
  if (!r?.boundingbox) return null;
  const [sul, norte, oeste, leste] = r.boundingbox.map(Number);
  return {
    id: r.osm_id,
    nome,
    uf,
    centro: { latitude: Number(r.lat), longitude: Number(r.lon) },
    area: { sul, norte, oeste, leste },
  };
}

function paraTrechos(geojson: ResultadoApi['geojson']): Coordenadas[][] {
  if (!geojson || !('coordinates' in geojson)) return [];
  const linhas = geojson.type === 'LineString' ? [geojson.coordinates] : geojson.coordinates;
  return linhas.flatMap((linha) => {
    const trecho: Coordenadas[] = [];
    for (const [longitude, latitude] of linha) {
      const ponto = { latitude, longitude };
      const anterior = trecho[trecho.length - 1];
      if (!anterior || distanciaKm(anterior, ponto) >= PASSO_MINIMO_KM) trecho.push(ponto);
    }
    return trecho.length >= 2 ? [trecho] : [];
  });
}

type Busca = {
  area: Area;
  referencia: Coordenadas;
  raioKm: number | null;
  aoAchar?: (trilhas: Trilha[]) => void; // a cada termo, com o que já achou
};

// Mesmo critério da consulta da Overpass, mesmo formato de Trilha
export async function buscarTrilhasRapido({
  area,
  referencia,
  raioKm,
  aoAchar,
}: Busca): Promise<Trilha[]> {
  const porNome = new Map<
    string,
    { ids: number[]; tags: Record<string, string>; nome: string; trechos: Coordenadas[][] }
  >();
  const montar = (): Trilha[] =>
    [...porNome.values()].flatMap((g): Trilha[] => {
      if (g.trechos.length === 0) return [];
      const inicio = g.trechos[0][0];
      const distancia = pontoMaisPerto(referencia, { trechos: g.trechos, inicio });
      if (raioKm !== null && distancia > raioKm) return [];
      let comprimento = 0;
      for (const t of g.trechos) {
        for (let i = 1; i < t.length; i++) comprimento += distanciaKm(t[i - 1], t[i]);
      }
      return [
        {
          // Menor id do grupo: a Overpass usa o mesmo, então favorita e risco continuam valendo
          id: `w${Math.min(...g.ids)}`,
          origem: 'osm',
          nome: g.nome,
          de: g.tags.from ?? null,
          para: g.tags.to ?? null,
          descricao: null,
          trechos: g.trechos,
          inicio,
          comprimentoKm: comprimento,
          rotaLonga: false,
          distanciaKm: distancia,
        },
      ];
    });
  let respostas = 0;

  for (const termo of TERMOS) {
    const resultados = await buscarTermo(termo, area).catch(() => null);
    if (!resultados) continue;
    respostas++;
    for (const r of resultados) {
      if (!ehTrilha(r)) continue;
      const tags = r.extratags ?? {};
      const chave = r.name.trim().toLowerCase();
      const grupo = porNome.get(chave) ?? { ids: [], tags, nome: r.name, trechos: [] };
      if (grupo.ids.includes(r.osm_id)) continue; // termos diferentes acham o mesmo caminho
      grupo.ids.push(r.osm_id);
      grupo.trechos.push(...paraTrechos(r.geojson));
      porNome.set(chave, grupo);
    }
    aoAchar?.(montar());
  }
  if (respostas === 0) throw new Error('Nominatim fora do ar');
  return montar();
}
