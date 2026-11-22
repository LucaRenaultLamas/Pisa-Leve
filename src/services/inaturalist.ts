import { TAXONS, ehPeconhento, grupoDe, ligadoAAlergia, type Grupo } from '@/constants/animais';
import type { Coordenadas } from '@/services/localizacao';
import { distanciaKm } from '@/utils/geo';

const API = 'https://api.inaturalist.org/v1';
const TEMPO_LIMITE_MS = 15_000;

export type Avistamento = {
  id: number;
  taxonId: number;
  nome: string; // popular em pt-BR, ou o científico
  nomeCientifico: string;
  foto: string | null;
  coordenadas: Coordenadas;
  distanciaKm: number;
  data: string | null;
  grupo: Grupo;
  alergia: boolean;
  peconhento: boolean;
};

export type ResultadoAvistamentos = {
  avistamentos: Avistamento[];
  total: number; // no raio todo; a lista só traz os recentes
  totalAlergia: number;
};

export class ErroApi extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = 'ErroApi';
  }
}

// fetch com tempo limite e erro em português
export async function pegarJson<T>(
  caminho: string,
  params: Record<string, string | number>,
): Promise<T> {
  const busca = new URLSearchParams(
    Object.entries(params).map(([chave, valor]) => [chave, String(valor)]),
  );
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);

  try {
    const resposta = await fetch(`${API}${caminho}?${busca}`, {
      signal: controle.signal,
      headers: { Accept: 'application/json' },
    });
    if (resposta.status === 429) {
      throw new ErroApi('Muitas buscas seguidas no iNaturalist. Espere um pouco e tente de novo.');
    }
    if (!resposta.ok) {
      throw new ErroApi(`O iNaturalist não respondeu direito (erro ${resposta.status}).`);
    }
    return (await resposta.json()) as T;
  } catch (erro) {
    if (erro instanceof ErroApi) throw erro;
    if (erro instanceof Error && erro.name === 'AbortError') {
      throw new ErroApi('O iNaturalist demorou demais para responder. Tente de novo.');
    }
    throw new ErroApi('Sem conexão com o iNaturalist. Confira sua internet.');
  } finally {
    clearTimeout(relogio);
  }
}

type ObservacaoApi = {
  id: number;
  observed_on: string | null;
  geojson: { coordinates: [number, number] } | null;
  photos: { url: string }[];
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string;
    ancestor_ids: number[];
  } | null;
};

type RespostaObservacoes = {
  total_results: number;
  results: ObservacaoApi[];
};

type Busca = {
  centro: Coordenadas;
  raioKm: number;
  taxonsAlergia: number[];
  desde?: string | null; // "AAAA-MM-DD": só registros a partir desse dia (total e lista)
};

// Só registros confirmados (research grade)
export async function buscarAvistamentos({
  centro,
  raioKm,
  taxonsAlergia,
  desde,
}: Busca): Promise<ResultadoAvistamentos> {
  const base = {
    lat: centro.latitude,
    lng: centro.longitude,
    radius: raioKm,
    quality_grade: 'research',
    locale: 'pt-BR',
    ...(desde ? { d1: desde } : {}),
  };
  const taxons = [TAXONS.cobras, TAXONS.aranhas, TAXONS.escorpioes, ...taxonsAlergia];

  const [lista, alergias] = await Promise.all([
    pegarJson<RespostaObservacoes>('/observations', {
      ...base,
      taxon_id: [...new Set(taxons)].join(','),
      photos: 'true',
      order_by: 'observed_on',
      order: 'desc',
      per_page: 80,
    }),
    // per_page=0 só conta, sem trazer as observações
    taxonsAlergia.length > 0
      ? pegarJson<RespostaObservacoes>('/observations', {
          ...base,
          taxon_id: taxonsAlergia.join(','),
          per_page: 0,
        })
      : Promise.resolve({ total_results: 0, results: [] }),
  ]);

  const avistamentos = lista.results.flatMap((obs): Avistamento[] => {
    if (!obs.taxon || !obs.geojson) return [];
    const [longitude, latitude] = obs.geojson.coordinates;
    const coordenadas = { latitude, longitude };
    const ancestrais = [...obs.taxon.ancestor_ids, obs.taxon.id];

    return [
      {
        id: obs.id,
        taxonId: obs.taxon.id,
        nome: obs.taxon.preferred_common_name ?? obs.taxon.name,
        nomeCientifico: obs.taxon.name,
        // "small" (240 px) no lugar da miniatura de 75 px
        foto: obs.photos[0]?.url.replace('/square.', '/small.') ?? null,
        coordenadas,
        distanciaKm: distanciaKm(centro, coordenadas),
        data: obs.observed_on,
        grupo: grupoDe(ancestrais),
        alergia: ligadoAAlergia(ancestrais, taxonsAlergia),
        peconhento: ehPeconhento(ancestrais),
      },
    ];
  });

  return {
    avistamentos,
    total: lista.total_results,
    totalAlergia: alergias.total_results,
  };
}

type RespostaLugares = {
  results: { standard: { display_name: string; admin_level: number | null }[] };
};

// Pelo iNaturalist porque o geocoder do Expo não roda na web
export async function buscarNomeDoLugar(centro: Coordenadas): Promise<string | null> {
  const d = 0.01;
  const resposta = await pegarJson<RespostaLugares>('/places/nearby', {
    nelat: centro.latitude + d,
    nelng: centro.longitude + d,
    swlat: centro.latitude - d,
    swlng: centro.longitude - d,
    per_page: 20,
  });

  // Nível 20 = município, 10 = estado
  const lugares = resposta.results.standard;
  const lugar =
    lugares.find((l) => l.admin_level === 20) ?? lugares.find((l) => l.admin_level === 10);
  return lugar ? lugar.display_name.replace(/, [A-Z]{2}$/, '') : null;
}

export type Animal = {
  id: number;
  nome: string; // popular em pt-BR, ou o científico
  nomeCientifico: string;
  foto: string | null;
  creditoFoto: string | null;
  resumo: string | null; // da Wikipédia, quando o iNaturalist tem
  linkWikipedia: string | null;
  classificacao: string[]; // classe > ordem > família
  ancestrais: number[];
  observacoesNoMundo: number;
};

type TaxonApi = {
  id: number;
  name: string;
  preferred_common_name?: string;
  default_photo?: { medium_url: string; attribution: string } | null;
  wikipedia_summary?: string | null;
  wikipedia_url?: string | null;
  observations_count: number;
  ancestor_ids: number[];
  ancestors?: { rank: string; name: string; preferred_common_name?: string }[];
};

// O resumo vem em HTML (<b>, <a>...): fica só o texto
function semHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .trim();
}

const NIVEIS_CLASSIFICACAO = ['class', 'order', 'family'];

export async function buscarAnimal(taxonId: number): Promise<Animal> {
  const { results } = await pegarJson<{ results: TaxonApi[] }>(`/taxa/${taxonId}`, {
    locale: 'pt-BR',
  });
  const t = results[0];
  if (!t) throw new ErroApi('Esse animal não foi encontrado no iNaturalist.');
  return {
    id: t.id,
    nome: t.preferred_common_name ?? t.name,
    nomeCientifico: t.name,
    foto: t.default_photo?.medium_url ?? null,
    creditoFoto: t.default_photo?.attribution ?? null,
    resumo: t.wikipedia_summary ? semHtml(t.wikipedia_summary) : null,
    linkWikipedia: t.wikipedia_url ?? null,
    classificacao: (t.ancestors ?? [])
      .filter((a) => NIVEIS_CLASSIFICACAO.includes(a.rank))
      .map((a) => a.preferred_common_name ?? a.name),
    ancestrais: [...t.ancestor_ids, t.id],
    observacoesNoMundo: t.observations_count,
  };
}

export type DetalheAvistamento = {
  id: number;
  fotos: string[];
  creditoFoto: string | null;
  data: string | null;
  horario: string | null; // "HH:MM" no fuso do aparelho
  lugar: string | null;
  observador: string | null;
  identificacoes: number;
  confirmado: boolean; // "research grade": a comunidade concordou com a espécie
  coordenadas: Coordenadas | null;
  link: string;
};

type ObservacaoCompletaApi = {
  id: number;
  observed_on: string | null;
  time_observed_at: string | null;
  place_guess: string | null;
  quality_grade: string;
  identifications_count: number;
  uri: string;
  geojson: { coordinates: [number, number] } | null;
  user?: { login: string; name?: string | null } | null;
  photos: { url: string; attribution: string }[];
};

// "Rua X, 112-178 - Bairro, Cidade - MG, 36046-410, Brasil - ..." -> "Rua X, Cidade"
function resumirLugar(lugar: string | null) {
  if (!lugar) return null;
  const partes = [
    ...new Set(
      lugar
        .split(/,| - /)
        .map((p) => p.trim())
        .filter((p) => p && !/^[\d\s-]+$/.test(p) && !/^[A-Z]{2}$/.test(p))
        .filter((p) => !['Brasil', 'Brazil', 'BR'].includes(p)),
    ),
  ];
  if (partes.length <= 2) return partes.join(', ');
  return `${partes[0]}, ${partes[partes.length - 1]}`;
}

export async function buscarDetalheAvistamento(id: number): Promise<DetalheAvistamento> {
  const { results } = await pegarJson<{ results: ObservacaoCompletaApi[] }>(`/observations/${id}`, {
    locale: 'pt-BR',
  });
  const o = results[0];
  if (!o) throw new ErroApi('Esse avistamento não foi encontrado no iNaturalist.');
  const coordenadas = o.geojson
    ? { latitude: o.geojson.coordinates[1], longitude: o.geojson.coordinates[0] }
    : null;
  return {
    id: o.id,
    // "medium" (500 px) no lugar da miniatura de 75 px
    fotos: o.photos.map((p) => p.url.replace('/square.', '/medium.')),
    creditoFoto: o.photos[0]?.attribution ?? null,
    data: o.observed_on,
    horario: o.time_observed_at
      ? new Date(o.time_observed_at).toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        })
      : null,
    lugar: resumirLugar(o.place_guess),
    observador: o.user ? (o.user.name ?? o.user.login) : null,
    identificacoes: o.identifications_count,
    confirmado: o.quality_grade === 'research',
    coordenadas,
    link: o.uri,
  };
}
