import { COR_RISCO } from '@/components/MiniTrilha';
import { cores } from '@/constants/tema';
import type { Coordenadas } from '@/services/localizacao';
import type { RegistroRisco, RiscoTrilha } from '@/services/risco';
import { areaEmVolta, type Area, type Trilha } from '@/services/trilhas';

// Mesmas props no mapa do celular e no da web
export type PropsMapaTrilha = {
  trilha: Pick<Trilha, 'trechos' | 'inicio'>;
  risco: RiscoTrilha | null | undefined; // undefined = calculando
  raioSemDesenhoKm: number; // trilha sem desenho: área em volta do início que conta no risco
  onAbrirRegistro: (registro: RegistroRisco) => void;
};

export const TRACEJADO = [10, 7];
export const COR_SEM_RISCO = cores.bordaForte; // enquanto calcula ou se falhou

// Cada pedaço com a sua cor; sem risco ainda, a trilha inteira em cinza
export function linhasColoridas(
  trilha: PropsMapaTrilha['trilha'],
  risco: PropsMapaTrilha['risco'],
) {
  if (risco && risco.trechos.length > 0) {
    return risco.trechos.map((t) => ({ pontos: t.pontos, cor: COR_RISCO[t.nivel] }));
  }
  return trilha.trechos.map((pontos) => ({ pontos, cor: COR_SEM_RISCO }));
}

export const corDoRegistro = (r: RegistroRisco) =>
  r.peconhento ? COR_RISCO.alto : COR_RISCO.medio;

// Tudo o que aparece no mapa, com uma folga mínima pra trilha curtinha não virar zoom 18
export function areaDoMapa(
  trilha: PropsMapaTrilha['trilha'],
  risco: PropsMapaTrilha['risco'],
  raioSemDesenhoKm: number,
): Area {
  const pontos: Coordenadas[] = [
    trilha.inicio,
    ...trilha.trechos.flat(),
    ...(risco?.registros.map((r) => r.ponto) ?? []),
  ];
  if (trilha.trechos.length === 0) {
    const volta = areaEmVolta(trilha.inicio, raioSemDesenhoKm * 1.15);
    pontos.push(
      { latitude: volta.norte, longitude: volta.leste },
      { latitude: volta.sul, longitude: volta.oeste },
    );
  }
  const area = {
    sul: Math.min(...pontos.map((p) => p.latitude)),
    norte: Math.max(...pontos.map((p) => p.latitude)),
    oeste: Math.min(...pontos.map((p) => p.longitude)),
    leste: Math.max(...pontos.map((p) => p.longitude)),
  };
  const minimo = 0.004; // ~400 m
  const sobraLat = Math.max(0, minimo - (area.norte - area.sul)) / 2;
  const sobraLon = Math.max(0, minimo - (area.leste - area.oeste)) / 2;
  return {
    sul: area.sul - sobraLat,
    norte: area.norte + sobraLat,
    oeste: area.oeste - sobraLon,
    leste: area.leste + sobraLon,
  };
}
