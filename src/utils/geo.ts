import type { Coordenadas } from '@/services/localizacao';

const RAIO_TERRA_KM = 6371;
const rad = (graus: number) => (graus * Math.PI) / 180;

// Haversine
export function distanciaKm(a: Coordenadas, b: Coordenadas) {
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * RAIO_TERRA_KM * Math.asin(Math.sqrt(h));
}

export function formatarDistancia(km: number) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(1).replace('.', ',')} km`;
}

export function tempoAtras(data: string | null) {
  if (!data) return 'data desconhecida';
  // Meio-dia evita a data voltar um dia por causa do fuso
  const quando = new Date(`${data.slice(0, 10)}T12:00:00`);
  const hoje = new Date();
  hoje.setHours(12, 0, 0, 0);
  const dias = Math.round((hoje.getTime() - quando.getTime()) / 86_400_000);

  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 30) return `há ${dias} dias`;
  const meses = Math.round(dias / 30);
  if (meses < 12) return meses === 1 ? 'há 1 mês' : `há ${meses} meses`;
  const anos = Math.round(dias / 365);
  return anos === 1 ? 'há 1 ano' : `há ${anos} anos`;
}
