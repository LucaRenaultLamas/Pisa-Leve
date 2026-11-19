import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line } from 'react-native-svg';

import { descricaoPin, PinMapa } from '@/components/PinMapa';
import type { PropsMapaAvistamentos } from '@/components/mapaAvistamentos.tipos';
import { cores, fontes } from '@/constants/tema';
import { deslocamentoKm, formatarDistancia } from '@/utils/geo';

// react-native-maps não roda na web: aqui é um "radar" desenhado
export function MapaAvistamentos({ centro, raioKm, avistamentos, onAbrir }: PropsMapaAvistamentos) {
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  const { largura, altura } = tamanho;
  const cx = largura / 2;
  const cy = altura / 2;
  const raioPx = Math.max(0, Math.min(cx, cy) - 22);
  const escala = raioPx / raioKm;

  return (
    <View
      style={estilos.caixa}
      onLayout={(e) =>
        setTamanho({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })
      }
      accessibilityLabel={`Mapa simplificado com ${avistamentos.length} avistamentos a até ${raioKm} km`}>
      {largura > 0 && (
        <>
          <Svg width={largura} height={altura} style={StyleSheet.absoluteFill} aria-hidden>
            <Line x1={cx} y1={0} x2={cx} y2={altura} stroke={cores.superficie} strokeWidth={4} />
            <Line x1={0} y1={cy} x2={largura} y2={cy} stroke={cores.superficie} strokeWidth={4} />
            {[1 / 3, 2 / 3].map((f) => (
              <Circle
                key={f}
                cx={cx}
                cy={cy}
                r={raioPx * f}
                fill="none"
                stroke={cores.borda}
                strokeWidth={1.5}
              />
            ))}
            <Circle
              cx={cx}
              cy={cy}
              r={raioPx}
              fill={cores.primariaMedia}
              fillOpacity={0.08}
              stroke={cores.primariaMedia}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <Circle cx={cx} cy={cy} r={14} fill={cores.voceAqui} fillOpacity={0.2} />
            <Circle
              cx={cx}
              cy={cy}
              r={7}
              fill={cores.voceAqui}
              stroke={cores.superficie}
              strokeWidth={2.5}
            />
          </Svg>

          <Text style={[estilos.norte, { left: cx - 5 }]} aria-hidden>
            N
          </Text>
          <Text style={[estilos.escala, { left: cx + raioPx - 40, top: cy + 6 }]} aria-hidden>
            {raioKm} km
          </Text>

          {avistamentos.map((a) => {
            const { leste, norte } = deslocamentoKm(centro, a.coordenadas);
            // Acerta a ponta da gota no ponto
            const x = cx + leste * escala - 17;
            const y = cy - norte * escala - 38;
            return (
              <Pressable
                key={a.id}
                onPress={() => onAbrir(a)}
                accessibilityRole="link"
                accessibilityLabel={`${a.nome}, ${descricaoPin(a)}, a ${formatarDistancia(a.distanciaKm)}`}
                style={[estilos.pin, { left: x, top: y }]}>
                <PinMapa avistamento={a} />
              </Pressable>
            );
          })}
        </>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flex: 1,
    backgroundColor: cores.mapaFundo,
  },
  pin: {
    position: 'absolute',
    padding: 2,
    cursor: 'pointer',
  },
  norte: {
    position: 'absolute',
    top: 4,
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    color: cores.textoSecundario,
  },
  escala: {
    position: 'absolute',
    fontFamily: fontes.mono,
    fontSize: 10,
    color: cores.textoSecundario,
  },
});
