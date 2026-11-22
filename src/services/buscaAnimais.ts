import AsyncStorage from '@react-native-async-storage/async-storage';

import { TAXONS } from '@/constants/animais';
import { TAXONS_COM_PERIGO } from '@/constants/perigos';
import { pegarJson } from '@/services/inaturalist';
import type { Coordenadas } from '@/services/localizacao';

const ANIMAIS = 1; // Animalia
const INSETOS = 47158; // Insecta
const BRASIL = 6878; // place_id do iNaturalist: nomes populares usados no Brasil
export const RAIO_PERTO_KM = 25;

export type GrupoBusca = 'cobra' | 'aranha' | 'escorpiao' | 'inseto' | 'outro';

export type AnimalBusca = {
  id: number;
  nome: string; // popular em pt-BR, ou o científico
  nomeCientifico: string;
  nivel: string | null; // "Gênero", "Família"... (null = espécie)
  foto: string | null;
  ancestrais: number[];
  grupo: GrupoBusca;
  registros: number; // perto de você na lista "pedem cuidado"; no mundo na busca por nome
};

type TaxonApi = {
  id: number;
  name: string;
  rank: string;
  preferred_common_name?: string;
  default_photo?: { square_url: string } | null;
  ancestor_ids?: number[];
  observations_count: number;
};

const NIVEIS: Record<string, string> = {
  genus: 'Gênero',
  family: 'Família',
  subfamily: 'Subfamília',
  tribe: 'Tribo',
  order: 'Ordem',
  suborder: 'Subordem',
  superfamily: 'Superfamília',
  class: 'Classe',
  phylum: 'Filo',
};

function grupoDaBusca(ancestrais: number[]): GrupoBusca {
  if (ancestrais.includes(TAXONS.cobras)) return 'cobra';
  if (ancestrais.includes(TAXONS.aranhas)) return 'aranha';
  if (ancestrais.includes(TAXONS.escorpioes)) return 'escorpiao';
  if (ancestrais.includes(INSETOS)) return 'inseto';
  return 'outro';
}

function paraAnimal(t: TaxonApi, registros: number): AnimalBusca {
  const ancestrais = [...(t.ancestor_ids ?? []), t.id];
  return {
    id: t.id,
    nome: t.preferred_common_name ?? t.name,
    nomeCientifico: t.name,
    nivel: t.rank === 'species' || t.rank === 'subspecies' ? null : (NIVEIS[t.rank] ?? null),
    foto: t.default_photo?.square_url ?? null,
    ancestrais,
    grupo: grupoDaBusca(ancestrais),
    registros,
  };
}

// Por nome popular ou científico, só animais
export async function procurarAnimais(termo: string): Promise<AnimalBusca[]> {
  const { results } = await pegarJson<{ results: TaxonApi[] }>('/taxa/autocomplete', {
    q: termo,
    taxon_id: ANIMAIS,
    is_active: 'true',
    locale: 'pt-BR',
    preferred_place_id: BRASIL,
    per_page: 30,
  });
  return results.map((t) => paraAnimal(t, t.observations_count));
}

// Bichos com algum perigo mais registrados perto (ou no Brasil, sem localização)
export async function animaisDeCuidado(
  centro: Coordenadas | null,
  taxonsAlergia: number[],
): Promise<AnimalBusca[]> {
  const onde: Record<string, number> = centro
    ? { lat: centro.latitude, lng: centro.longitude, radius: RAIO_PERTO_KM }
    : { place_id: BRASIL };
  const { results } = await pegarJson<{ results: { count: number; taxon: TaxonApi }[] }>(
    '/observations/species_counts',
    {
      ...onde,
      taxon_id: [...new Set([...TAXONS_COM_PERIGO, ...taxonsAlergia])].join(','),
      quality_grade: 'research',
      locale: 'pt-BR',
      preferred_place_id: BRASIL,
      per_page: 60,
    },
  );
  return results.map((r) => paraAnimal(r.taxon, r.count));
}

// Buscas recentes, por usuário
const MAX_RECENTES = 6;
const chave = (usuario: string) => `@pisa-leve/buscas-recentes/${usuario}`;

export async function lerBuscasRecentes(usuario: string): Promise<string[]> {
  const texto = await AsyncStorage.getItem(chave(usuario));
  return texto ? (JSON.parse(texto) as string[]) : [];
}

export async function guardarBuscaRecente(usuario: string, termo: string) {
  const atuais = await lerBuscasRecentes(usuario);
  const novas = [
    termo,
    ...atuais.filter((t) => t.toLocaleLowerCase() !== termo.toLocaleLowerCase()),
  ].slice(0, MAX_RECENTES);
  await AsyncStorage.setItem(chave(usuario), JSON.stringify(novas));
  return novas;
}

export async function limparBuscasRecentes(usuario: string) {
  await AsyncStorage.removeItem(chave(usuario));
}
