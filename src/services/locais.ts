import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ehPeconhento,
  grupoDe,
  ligadoAAlergia,
  TAXONS_PECONHENTOS,
  type Grupo,
} from '@/constants/animais';
import { pegarJson } from '@/services/inaturalist';
import type { Coordenadas } from '@/services/localizacao';
import { diaLocal, distanciaKm } from '@/utils/geo';

export type TipoLocal = 'casa' | 'trabalho' | 'trilha' | 'outro';

export type Local = {
  id: string;
  nome: string;
  tipo: TipoLocal;
  ponto: Coordenadas;
  raioKm: number;
  trilhaId: string | null; // quando veio do "Monitorar esta trilha"
  criadoEm: number;
  vistoEm: number; // registros enviados depois disso contam como novos
};

export type RegistroLocal = {
  id: number;
  taxonId: number;
  nome: string;
  nomeCientifico: string;
  foto: string | null;
  coordenadas: Coordenadas;
  distanciaKm: number; // do ponto do local
  data: string | null; // quando foi visto
  enviadoEm: number; // quando entrou no iNaturalist
  grupo: Grupo;
  peconhento: boolean;
  alergia: boolean;
  confirmado: boolean;
  novo: boolean;
};

export const RAIOS_LOCAL_KM = [0.5, 1, 2, 5];
export const MAX_LOCAIS = 10;
// A lista do local mostra pelo menos isso pra trás, mesmo sem nada novo
export const DIAS_HISTORICO = 30;
// Foto antiga enviada agora não vira alerta: só animais vistos de lá pra cá
export const DIAS_VISTO = 365;

const chave = (usuario: string) => `@pisa-leve/locais/${usuario}`;

export async function lerLocais(usuario: string): Promise<Local[]> {
  const texto = await AsyncStorage.getItem(chave(usuario));
  return texto ? (JSON.parse(texto) as Local[]) : [];
}

export async function guardarLocais(usuario: string, locais: Local[]) {
  await AsyncStorage.setItem(chave(usuario), JSON.stringify(locais));
}

type ObservacaoApi = {
  id: number;
  observed_on: string | null;
  created_at: string;
  quality_grade: string;
  geojson: { coordinates: [number, number] } | null;
  photos: { url: string }[];
  taxon: {
    id: number;
    name: string;
    preferred_common_name?: string;
    ancestor_ids: number[];
  } | null;
};

// Entram os não confirmados: a confirmação da comunidade pode levar dias
export async function registrosDoLocal(
  local: Local,
  taxonsAlergia: number[],
): Promise<RegistroLocal[]> {
  const desde = Math.min(local.vistoEm, Date.now() - DIAS_HISTORICO * 86_400_000);
  const { results } = await pegarJson<{ results: ObservacaoApi[] }>('/observations', {
    lat: local.ponto.latitude,
    lng: local.ponto.longitude,
    radius: local.raioKm,
    taxon_id: [...new Set([...TAXONS_PECONHENTOS, ...taxonsAlergia])].join(','),
    quality_grade: 'research,needs_id',
    created_d1: diaLocal(new Date(desde)),
    d1: diaLocal(new Date(Date.now() - DIAS_VISTO * 86_400_000)),
    order_by: 'created_at',
    order: 'desc',
    locale: 'pt-BR',
    per_page: 50,
  });

  return results.flatMap((o): RegistroLocal[] => {
    if (!o.taxon || !o.geojson) return [];
    const [longitude, latitude] = o.geojson.coordinates;
    const coordenadas = { latitude, longitude };
    const ancestrais = [...o.taxon.ancestor_ids, o.taxon.id];
    const enviadoEm = new Date(o.created_at).getTime();
    return [
      {
        id: o.id,
        taxonId: o.taxon.id,
        nome: o.taxon.preferred_common_name ?? o.taxon.name,
        nomeCientifico: o.taxon.name,
        foto: o.photos[0]?.url.replace('/square.', '/small.') ?? null,
        coordenadas,
        distanciaKm: distanciaKm(local.ponto, coordenadas),
        data: o.observed_on,
        enviadoEm,
        grupo: grupoDe(ancestrais),
        peconhento: ehPeconhento(ancestrais),
        alergia: ligadoAAlergia(ancestrais, taxonsAlergia),
        confirmado: o.quality_grade === 'research',
        novo: enviadoEm > local.vistoEm,
      },
    ];
  });
}

export const ROTULO_TIPO: Record<TipoLocal, string> = {
  casa: 'Casa',
  trabalho: 'Trabalho ou escola',
  trilha: 'Trilha',
  outro: 'Outro lugar',
};

export function formatarRaio(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${String(km).replace('.', ',')} km`;
}
