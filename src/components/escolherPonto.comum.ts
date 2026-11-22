import type { Coordenadas } from '@/services/localizacao';

// Mesmas props no celular e na web
export type PropsEscolherPonto = {
  // Onde o mapa se enquadra; muda quando a pessoa pede "minha localização" ou troca o raio
  enquadre: { centro: Coordenadas; raioKm: number };
  ponto: Coordenadas; // o centro de agora, pra desenhar o círculo
  raioKm: number;
  onMudar: (ponto: Coordenadas) => void;
};

export const TAM_PINO = 40;
export const COR_CIRCULO = 'rgba(43, 106, 75, 0.12)';
