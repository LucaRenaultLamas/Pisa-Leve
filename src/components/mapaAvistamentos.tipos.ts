import type { Avistamento } from '@/services/inaturalist';
import type { Coordenadas } from '@/services/localizacao';

// Mesmas props no mapa do celular e no da web
export type PropsMapaAvistamentos = {
  centro: Coordenadas;
  raioKm: number;
  avistamentos: Avistamento[];
  onAbrir: (avistamento: Avistamento) => void;
};
