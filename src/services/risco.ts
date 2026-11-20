import { ehPeconhento, ligadoAAlergia, TAXONS_PECONHENTOS } from '@/constants/animais';
import type { Coordenadas } from '@/services/localizacao';
import type { Trilha } from '@/services/trilhas';
import { distanciaKm } from '@/utils/geo';

// v2 deixa pedir só os campos usados: 2 registros caem de ~400 KB para menos de 1 KB
const API_V2 = 'https://api.inaturalist.org/v2/observations';
const TEMPO_LIMITE_MS = 15_000;
const TAM_TRECHO_KM = 0.5;
export const PERTO_DA_TRILHA_KM = 0.3;
export const RAIO_SO_INICIO_KM = 0.5; // trilha da lista fixa, que não tem desenho
export const ANOS_RECENTES = 2;

export type NivelRisco = 'baixo' | 'medio' | 'alto';
export type TrechoRisco = { pontos: Coordenadas[]; nivel: NivelRisco };
export type RegistroRisco = {
  id: number;
  taxonId: number;
  nome: string;
  nomeCientifico: string;
  ponto: Coordenadas;
  data: string | null;
  peconhento: boolean;
  alergia: boolean;
  trecho: number | null; // índice em `trechos`; null na trilha sem desenho
};
export type RiscoTrilha = {
  nivel: NivelRisco;
  trechos: TrechoRisco[];
  peconhentos: number;
  alergias: number;
  registros: RegistroRisco[];
};

const ORDEM: NivelRisco[] = ['baixo', 'medio', 'alto'];
export const pesoRisco = (nivel: NivelRisco) => ORDEM.indexOf(nivel);

type ObservacaoApi = {
  id: number;
  observed_on: string | null;
  geojson: { coordinates: [number, number] } | null;
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string | null;
    ancestor_ids: number[];
  } | null;
};

async function buscarObservacoes(params: Record<string, string | number>) {
  const busca = new URLSearchParams(
    Object.entries(params).map(([chave, valor]) => [chave, String(valor)]),
  );
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_MS);
  try {
    const resposta = await fetch(`${API_V2}?${busca}`, { signal: controle.signal });
    if (!resposta.ok) throw new Error(`iNaturalist ${resposta.status}`);
    const dados = (await resposta.json()) as { results: ObservacaoApi[] };
    return dados.results;
  } finally {
    clearTimeout(relogio);
  }
}

// Corta o desenho em pedaços de ~500 m; cada pedaço emenda no anterior
function dividirEmTrechos(trilha: Trilha) {
  const trechos: Coordenadas[][] = [];
  for (const linha of trilha.trechos) {
    let atual: Coordenadas[] = [linha[0]];
    let andado = 0;
    for (let i = 1; i < linha.length; i++) {
      andado += distanciaKm(linha[i - 1], linha[i]);
      atual.push(linha[i]);
      if (andado >= TAM_TRECHO_KM) {
        trechos.push(atual);
        atual = [linha[i]];
        andado = 0;
      }
    }
    if (atual.length >= 2) trechos.push(atual);
  }
  return trechos;
}

function nivelDe(peconhentos: number, alergias: number): NivelRisco {
  if (peconhentos > 0) return 'alto';
  if (alergias > 0) return 'medio';
  return 'baixo';
}

// Guarda a promessa: se a tela pedir de novo no meio do caminho, reaproveita o mesmo pedido
const cache = new Map<string, Promise<RiscoTrilha>>();

export function calcularRisco(trilha: Trilha, taxonsAlergia: number[]): Promise<RiscoTrilha> {
  const chave = `${trilha.id}|${taxonsAlergia.join(',')}`;
  const guardado = cache.get(chave);
  if (guardado) return guardado;
  const pedido = calcular(trilha, taxonsAlergia);
  cache.set(chave, pedido);
  pedido.catch(() => cache.delete(chave)); // falhou: deixa tentar de novo depois
  return pedido;
}

async function calcular(trilha: Trilha, taxonsAlergia: number[]): Promise<RiscoTrilha> {
  const desde = new Date(Date.now() - ANOS_RECENTES * 365 * 86_400_000);
  const base = {
    taxon_id: [...new Set([...TAXONS_PECONHENTOS, ...taxonsAlergia])].join(','),
    quality_grade: 'research',
    d1: desde.toISOString().slice(0, 10),
    per_page: 200,
    locale: 'pt-BR',
    fields:
      'id,observed_on,geojson,taxon.id,taxon.name,taxon.preferred_common_name,taxon.ancestor_ids',
  };

  const trechos = dividirEmTrechos(trilha);
  let area: Record<string, number>;
  if (trechos.length > 0) {
    const pontos = trechos.flat();
    const folga = 0.003; // ~300 m
    area = {
      nelat: Math.max(...pontos.map((p) => p.latitude)) + folga,
      nelng: Math.max(...pontos.map((p) => p.longitude)) + folga,
      swlat: Math.min(...pontos.map((p) => p.latitude)) - folga,
      swlng: Math.min(...pontos.map((p) => p.longitude)) - folga,
    };
  } else {
    area = {
      lat: trilha.inicio.latitude,
      lng: trilha.inicio.longitude,
      radius: RAIO_SO_INICIO_KM,
    };
  }

  const observacoes = await buscarObservacoes({ ...base, ...area });
  const contagem = trechos.map(() => ({ peconhentos: 0, alergias: 0 }));
  let peconhentos = 0;
  let alergias = 0;
  const registros: RegistroRisco[] = [];

  for (const obs of observacoes) {
    if (!obs.taxon || !obs.geojson) continue;
    const [longitude, latitude] = obs.geojson.coordinates;
    const ponto = { latitude, longitude };
    const ancestrais = [...obs.taxon.ancestor_ids, obs.taxon.id];
    const ehPerigo = ehPeconhento(ancestrais);
    const ehAlergia = ligadoAAlergia(ancestrais, taxonsAlergia);
    if (!ehPerigo && !ehAlergia) continue;

    let melhor: number | null = null;
    if (trechos.length > 0) {
      // Vai pro trecho mais perto; longe demais da trilha não conta
      let menor = Infinity;
      for (let i = 0; i < trechos.length; i++) {
        for (const p of trechos[i]) {
          const d = distanciaKm(p, ponto);
          if (d < menor) {
            menor = d;
            melhor = i;
          }
        }
      }
      if (melhor === null || menor > PERTO_DA_TRILHA_KM) continue;
      if (ehPerigo) contagem[melhor].peconhentos++;
      if (ehAlergia) contagem[melhor].alergias++;
    }
    if (ehPerigo) peconhentos++;
    if (ehAlergia) alergias++;
    registros.push({
      id: obs.id,
      taxonId: obs.taxon.id,
      nome: obs.taxon.preferred_common_name ?? obs.taxon.name,
      nomeCientifico: obs.taxon.name,
      ponto,
      data: obs.observed_on,
      peconhento: ehPerigo,
      alergia: ehAlergia,
      trecho: melhor,
    });
  }

  const risco: RiscoTrilha = {
    nivel: nivelDe(peconhentos, alergias),
    trechos: trechos.map((pontos, i) => ({
      pontos,
      nivel: nivelDe(contagem[i].peconhentos, contagem[i].alergias),
    })),
    peconhentos,
    alergias,
    // Mais recentes primeiro
    registros: registros.sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '')),
  };
  return risco;
}
