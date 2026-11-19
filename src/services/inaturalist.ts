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
async function pegarJson<T>(caminho: string, params: Record<string, string | number>): Promise<T> {
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
};

// Só registros confirmados (research grade)
export async function buscarAvistamentos({
  centro,
  raioKm,
  taxonsAlergia,
}: Busca): Promise<ResultadoAvistamentos> {
  const base = {
    lat: centro.latitude,
    lng: centro.longitude,
    radius: raioKm,
    quality_grade: 'research',
    locale: 'pt-BR',
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
