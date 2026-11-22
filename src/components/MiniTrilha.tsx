import { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

import { Icone } from '@/components/Icone';

import { cores, raios } from '@/constants/tema';
import type { Coordenadas } from '@/services/localizacao';
import type { NivelRisco, RiscoTrilha } from '@/services/risco';

type Props = {
  trechos: Coordenadas[][];
  inicio: Coordenadas;
  tamanho?: number;
  risco?: RiscoTrilha | null; // com risco, cada trecho sai na cor dele
};

export const COR_RISCO: Record<NivelRisco, string> = {
  baixo: cores.riscoBaixo,
  medio: cores.riscoMedio,
  alto: cores.riscoAlto,
};

const MARGEM = 10;
const PONTOS_POR_TRECHO = 40; // o suficiente para a miniatura, sem pesar

export function MiniTrilha({ trechos, inicio, tamanho = 76, risco }: Props) {
  const desenho = useMemo(() => {
    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLon = Infinity;
    let maxLon = -Infinity;
    for (const trecho of trechos) {
      for (const p of trecho) {
        minLat = Math.min(minLat, p.latitude);
        maxLat = Math.max(maxLat, p.latitude);
        minLon = Math.min(minLon, p.longitude);
        maxLon = Math.max(maxLon, p.longitude);
      }
    }

    // Longitude encolhe longe do equador; sem isso a trilha sai esticada
    const encolhe = Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
    const largura = (maxLon - minLon) * encolhe;
    const altura = maxLat - minLat;
    const util = tamanho - MARGEM * 2;
    const escala = util / Math.max(largura, altura, 1e-6);
    const sobraX = (util - largura * escala) / 2;
    const sobraY = (util - altura * escala) / 2;

    const ponto = (p: Coordenadas) => ({
      x: MARGEM + sobraX + (p.longitude - minLon) * encolhe * escala,
      y: MARGEM + sobraY + (maxLat - p.latitude) * escala,
    });

    const comCor = risco && risco.trechos.length > 0;
    const fonte = comCor
      ? risco.trechos.map((t) => ({ pontos: t.pontos, cor: COR_RISCO[t.nivel] }))
      : trechos.map((pontos) => ({ pontos, cor: cores.primariaMedia }));

    const linhas = fonte.map(({ pontos: trecho, cor }) => {
      const passo = Math.max(1, Math.ceil(trecho.length / PONTOS_POR_TRECHO));
      const amostra = trecho.filter((_, i) => i % passo === 0 || i === trecho.length - 1);
      const texto = amostra
        .map(ponto)
        .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
        .join(' ');
      return { pontos: texto, cor };
    });

    return { linhas, inicio: ponto(inicio) };
  }, [trechos, inicio, tamanho, risco]);

  // Trilha da lista fixa: sem desenho, só um marcador
  if (trechos.length === 0) {
    return (
      <View
        style={{
          width: tamanho,
          height: tamanho,
          borderRadius: raios.md,
          backgroundColor: cores.mapaFundo,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden>
        <Icone nome="pin" cor={risco ? COR_RISCO[risco.nivel] : cores.primariaMedia} tamanho={28} />
      </View>
    );
  }

  return (
    <Svg
      width={tamanho}
      height={tamanho}
      style={{ borderRadius: raios.md, backgroundColor: cores.mapaFundo }}
      aria-hidden>
      {desenho.linhas.map(({ pontos, cor }, i) => (
        <Polyline
          key={i}
          points={pontos}
          fill="none"
          stroke={cor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      <Circle cx={desenho.inicio.x} cy={desenho.inicio.y} r={4} fill={cores.primaria} />
    </Svg>
  );
}
