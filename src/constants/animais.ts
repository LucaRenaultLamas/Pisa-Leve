// IDs de táxons do iNaturalist (conferidos na API em 19/11/2026)
export const TAXONS = {
  cobras: 85553, // Serpentes
  aranhas: 47118, // Araneae
  escorpioes: 48894, // Scorpiones
} as const;

// Alergia fica fora do grupo: um bicho pode ser aranha e alergia ao mesmo tempo
export type Grupo = 'cobra' | 'aranha' | 'escorpiao' | 'outro';

// Gêneros perigosos no Brasil; escorpião conta todo
export const TAXONS_PECONHENTOS = [
  30767, // Bothrops (jararacas)
  30692, // Crotalus (cascavéis)
  30493, // Micrurus (corais-verdadeiras)
  31047, // Lachesis (surucucu)
  48137, // Loxosceles (aranha-marrom)
  53388, // Phoneutria (armadeira)
  47370, // Latrodectus (viúva-negra)
  85106, // Lonomia (taturana): pode causar sangramento
  TAXONS.escorpioes,
];

// Pólen, fungos, látex etc. não viram um táxon só, então ficam de fora
export const TAXONS_POR_ALERGIA: Record<string, number[]> = {
  'abelhas-vespas': [630955, 52747], // Anthophila, Vespidae
  formigas: [47336], // Formicidae
  baratas: [81769], // Blattodea
  acaros: [52788], // Acari
  'veneno-aranhas': [TAXONS.aranhas],
  'picadas-insetos': [630955, 52747, 47336],
  urtiga: [51886], // Urtica
};

export function taxonsDasAlergias(alergias: string[]) {
  return [...new Set(alergias.flatMap((id) => TAXONS_POR_ALERGIA[id] ?? []))];
}

export function ehPeconhento(ancestrais: number[]) {
  return TAXONS_PECONHENTOS.some((id) => ancestrais.includes(id));
}

export function grupoDe(ancestrais: number[]): Grupo {
  if (ancestrais.includes(TAXONS.cobras)) return 'cobra';
  if (ancestrais.includes(TAXONS.aranhas)) return 'aranha';
  if (ancestrais.includes(TAXONS.escorpioes)) return 'escorpiao';
  return 'outro';
}

export function ligadoAAlergia(ancestrais: number[], taxonsAlergia: number[]) {
  return taxonsAlergia.some((id) => ancestrais.includes(id));
}

export const PINS: Record<Grupo | 'alergia', { letra: string; cor: string; nome: string }> = {
  cobra: { letra: 'C', cor: '#6B3E1F', nome: 'Cobra' },
  aranha: { letra: 'A', cor: '#46407A', nome: 'Aranha' },
  escorpiao: { letra: 'E', cor: '#9C4A12', nome: 'Escorpião' },
  alergia: { letra: '!', cor: '#8A6400', nome: 'Ligado à sua alergia' },
  outro: { letra: '•', cor: '#4D6155', nome: 'Outro' },
};
