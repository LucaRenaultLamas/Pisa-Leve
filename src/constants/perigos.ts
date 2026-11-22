import { TAXONS, TAXONS_PECONHENTOS } from '@/constants/animais';

// Grave = peçonhento de importância médica; cuidado = pica, ferroa ou queima, mas raramente é grave
export type NivelPerigo = 'grave' | 'cuidado';
export type Perigo = { nivel: NivelPerigo; selo: string; cuidados: string[] };

const LONOMIA = 85106;
const LAGARTAS_CACHORRINHO = 84186; // Megalopygidae
const ABELHAS = 630955; // Anthophila
const ABELHAS_SEM_FERRAO = 200106; // Meliponini (jataí, iraí...): não ferroam
const VESPAS = 52747; // Vespidae
const FORMIGAS = 47336; // Formicidae
const CENTOPEIAS = 49556; // Chilopoda (lacraias)

// Textos a partir das orientações do Ministério da Saúde, Instituto Butantan e Sesa-PR
const REGRAS: { taxons: number[]; perigo: Perigo | null }[] = [
  {
    taxons: [LONOMIA],
    perigo: {
      nivel: 'grave',
      selo: 'Peçonhento',
      cuidados: [
        'Não encoste: os espinhos da taturana têm veneno que pode causar sangramentos.',
        'Se encostar: lave com água corrente e sabão e faça compressa fria. Não passe nada no local.',
        'Procure atendimento médico imediatamente: só lá se avalia a necessidade de soro.',
      ],
    },
  },
  {
    taxons: TAXONS_PECONHENTOS,
    perigo: {
      nivel: 'grave',
      selo: 'Peçonhento',
      cuidados: [
        'Mantenha distância. Não tente pegar nem capturar o animal.',
        'Em caso de picada: lave com água e sabão, não faça torniquete, não corte nem sugue o local.',
        'Procure atendimento médico imediatamente.',
      ],
    },
  },
  {
    taxons: [TAXONS.cobras],
    perigo: {
      nivel: 'cuidado',
      selo: 'Pode morder',
      cuidados: [
        'Mantenha distância: cobras sem peçonha perigosa também mordem e são fáceis de confundir com as perigosas, como a coral-falsa e a verdadeira.',
        'Em caso de mordida: lave com água e sabão, não faça torniquete, não corte nem sugue o local.',
        'Procure atendimento médico: só lá se confirma se precisa de soro.',
      ],
    },
  },
  {
    taxons: [LAGARTAS_CACHORRINHO],
    perigo: {
      nivel: 'cuidado',
      selo: 'Queima',
      cuidados: [
        'Não encoste: os pelos da lagarta queimam a pele.',
        'Se encostar: lave com água fria e sabão e faça compressa fria, sem esfregar nem passar nada no local.',
        'Procure atendimento se a dor for forte ou se não souber qual lagarta foi.',
      ],
    },
  },
  { taxons: [ABELHAS_SEM_FERRAO], perigo: null },
  {
    taxons: [ABELHAS, VESPAS, FORMIGAS],
    perigo: {
      nivel: 'cuidado',
      selo: 'Ferroa',
      cuidados: [
        'Não mexa em colmeias, vespeiros nem formigueiros. Afaste-se com calma.',
        'Ferrão de abelha: raspe com a unha ou a borda de um cartão, sem pinça e sem apertar. Lave e faça compressa fria.',
        'Várias picadas, falta de ar, inchaço no rosto ou tontura: procure atendimento na hora.',
      ],
    },
  },
  {
    taxons: [TAXONS.aranhas, CENTOPEIAS],
    perigo: {
      nivel: 'cuidado',
      selo: 'Pode picar',
      cuidados: [
        'Não pegue com a mão: a maioria não é perigosa, mas a picada pode doer e inchar.',
        'Em caso de picada: lave com água e sabão e não aperte, corte nem passe nada no local.',
        'Procure atendimento se a dor for forte, se houver mal-estar ou se a ferida mudar de cor.',
      ],
    },
  },
];

// A primeira regra que bate vence: as mais específicas vêm antes
export function perigoDe(ancestrais: number[]): Perigo | null {
  return REGRAS.find((r) => r.taxons.some((id) => ancestrais.includes(id)))?.perigo ?? null;
}

// Tudo que tem perigo em alguma regra (para a lista "pedem cuidado" da Busca)
export const TAXONS_COM_PERIGO = [...new Set(REGRAS.flatMap((r) => (r.perigo ? r.taxons : [])))];
