import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Circle, Polyline } from 'react-native-svg';

import { MapaBaseWeb } from '@/components/MapaBaseWeb';
import { COR_RISCO } from '@/components/MiniTrilha';
import {
  areaDoMapa,
  corDoRegistro,
  linhasColoridas,
  TRACEJADO,
  type PropsMapaTrilha,
} from '@/components/mapaTrilha.comum';
import { cores } from '@/constants/tema';

const TAM_PONTO = 24;

export function MapaTrilha({ trilha, risco, raioSemDesenhoKm, onAbrirRegistro }: PropsMapaTrilha) {
  const area = useMemo(
    () => areaDoMapa(trilha, risco, raioSemDesenhoKm),
    [trilha, risco, raioSemDesenhoKm],
  );
  const linhas = useMemo(() => linhasColoridas(trilha, risco), [trilha, risco]);
  const registros = risco?.registros ?? [];

  return (
    <MapaBaseWeb
      area={area}
      rotulo="Mapa da trilha com o caminho colorido pelo risco de cada trecho"
      rotuloCentralizar="Mostrar a trilha inteira"
      camadaSvg={({ naTela, kmPorPx }) => {
        const inicio = naTela(trilha.inicio);
        const texto = (pontos: (typeof trilha.inicio)[]) =>
          pontos
            .map(naTela)
            .map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)
            .join(' ');
        return (
          <>
            {trilha.trechos.length === 0 && (
              <Circle
                cx={inicio.x}
                cy={inicio.y}
                r={raioSemDesenhoKm / kmPorPx}
                fill={risco ? COR_RISCO[risco.nivel] : cores.primariaMedia}
                fillOpacity={0.12}
                stroke={risco ? COR_RISCO[risco.nivel] : cores.primariaMedia}
                strokeWidth={2.5}
                strokeDasharray={TRACEJADO.join(' ')}
              />
            )}
            {/* Contorno branco por baixo: o tracejado aparece em cima de qualquer tile */}
            {linhas.map(({ pontos }, i) => (
              <Polyline
                key={`fundo${i}`}
                points={texto(pontos)}
                fill="none"
                stroke={cores.superficie}
                strokeOpacity={0.85}
                strokeWidth={9}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ))}
            {linhas.map(({ pontos, cor }, i) => (
              <Polyline
                key={`linha${i}`}
                points={texto(pontos)}
                fill="none"
                stroke={cor}
                strokeWidth={5}
                strokeDasharray={TRACEJADO.join(' ')}
                strokeLinejoin="round"
              />
            ))}
            <Circle
              cx={inicio.x}
              cy={inicio.y}
              r={8}
              fill={cores.primaria}
              stroke={cores.superficie}
              strokeWidth={3}
            />
          </>
        );
      }}
      sobre={({ naTela, largura, altura }) =>
        registros.map((r) => {
          const { x, y } = naTela(r.ponto);
          if (x < -20 || y < -20 || x > largura + 20 || y > altura + 20) return null;
          return (
            <Pressable
              key={r.id}
              onPress={() => onAbrirRegistro(r)}
              accessibilityRole="link"
              accessibilityLabel={`${r.nome}, ${r.peconhento ? 'peçonhento' : 'ligado à sua alergia'}`}
              hitSlop={6}
              style={[estilos.ponto, { left: x - TAM_PONTO / 2, top: y - TAM_PONTO / 2 }]}>
              <View style={[estilos.bolinha, { backgroundColor: corDoRegistro(r) }]} />
            </Pressable>
          );
        })
      }
    />
  );
}

const estilos = StyleSheet.create({
  ponto: {
    position: 'absolute',
    width: TAM_PONTO,
    height: TAM_PONTO,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  bolinha: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: cores.superficie,
    boxShadow: '0 1px 4px rgba(20, 38, 28, 0.35)',
  },
});
