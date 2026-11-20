import type { Coordenadas } from '@/services/localizacao';

// Parque Halfeld; as distâncias no modo Juiz de Fora contam daqui
export const CENTRO_JF: Coordenadas = { latitude: -21.7614, longitude: -43.3497 };

export type TrilhaJF = {
  id: string;
  nome: string;
  de: string | null;
  para: string | null;
  descricao: string;
  inicio: Coordenadas;
  comprimentoKm: number | null;
};

// O OpenStreetMap quase não tem trilhas de JF. Textos da Tribuna de Minas, UFJF e
// Prefeitura; coordenadas do próprio OSM (Nominatim), conferidas em 20/11/2026
export const TRILHAS_JF: TrilhaJF[] = [
  {
    id: 'jf-cristo',
    nome: 'Trilha do Cristo (do Tostão)',
    de: 'Rua Dr. Constantino Paleta',
    para: 'Morro do Cristo',
    descricao: 'Uma das trilhas mais conhecidas da cidade',
    inicio: { latitude: -21.76045, longitude: -43.3532 },
    comprimentoKm: 0.85,
  },
  {
    id: 'jf-jardim-botanico',
    nome: 'Trilha do Jardim Botânico da UFJF',
    de: null,
    para: null,
    descricao: 'Mata do Krambeck · ter. a dom., 8h às 17h, grátis',
    inicio: { latitude: -21.73773, longitude: -43.36931 },
    comprimentoKm: 0.7,
  },
  {
    id: 'jf-lajinha',
    nome: 'Volta do lago do Parque da Lajinha',
    de: null,
    para: null,
    descricao: 'Terra batida, plana, boa para iniciantes',
    inicio: { latitude: -21.79246, longitude: -43.36744 },
    comprimentoKm: 1,
  },
  {
    id: 'jf-remonta',
    nome: 'Trilha da Remonta',
    de: 'Bairro Grama',
    para: null,
    descricao: 'Mais puxada, muito usada por ciclistas',
    inicio: { latitude: -21.68627, longitude: -43.3552 },
    comprimentoKm: 38,
  },
  {
    id: 'jf-cabeca-de-formiga',
    nome: 'Pico Cabeça de Formiga',
    de: 'Dias Tavares (BR-267)',
    para: null,
    descricao: 'Serra da Saudade, divisa com Lima Duarte · visita paga',
    inicio: { latitude: -21.79154, longitude: -43.62584 },
    comprimentoKm: null,
  },
];
