import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { Circle } from 'react-native-svg';

import { MapaBaseWeb } from '@/components/MapaBaseWeb';
import { CAIXA_PIN, descricaoPin, PinMapa } from '@/components/PinMapa';
import type { PropsMapaAvistamentos } from '@/components/mapaAvistamentos.tipos';
import { cores } from '@/constants/tema';
import { areaEmVolta } from '@/services/trilhas';
import { formatarDistancia } from '@/utils/geo';

export function MapaAvistamentos({ centro, raioKm, avistamentos, onAbrir }: PropsMapaAvistamentos) {
  const area = useMemo(() => areaEmVolta(centro, raioKm), [centro, raioKm]);

  return (
    <MapaBaseWeb
      area={area}
      rotulo={`Mapa com ${avistamentos.length} avistamentos a até ${raioKm} km de você`}
      rotuloCentralizar="Centralizar no meu local"
      camadaSvg={({ naTela, kmPorPx }) => {
        const voce = naTela(centro);
        return (
          <>
            <Circle
              cx={voce.x}
              cy={voce.y}
              r={raioKm / kmPorPx}
              fill={cores.primariaMedia}
              fillOpacity={0.1}
              stroke={cores.primariaMedia}
              strokeWidth={2}
            />
            <Circle cx={voce.x} cy={voce.y} r={16} fill={cores.voceAqui} fillOpacity={0.2} />
            <Circle
              cx={voce.x}
              cy={voce.y}
              r={7}
              fill={cores.voceAqui}
              stroke={cores.superficie}
              strokeWidth={2.5}
            />
          </>
        );
      }}
      sobre={({ naTela, largura, altura }) =>
        avistamentos.map((a) => {
          const { x, y } = naTela(a.coordenadas);
          if (x < -40 || y < -40 || x > largura + 40 || y > altura + 40) return null;
          return (
            <Pressable
              key={a.id}
              onPress={() => onAbrir(a)}
              accessibilityRole="link"
              accessibilityLabel={`${a.nome}, ${descricaoPin(a)}, a ${formatarDistancia(a.distanciaKm)}`}
              // Ponta da gota no ponto: ela fica no meio do rodapé da caixa do pin
              style={[estilos.pin, { left: x - CAIXA_PIN / 2, top: y - CAIXA_PIN }]}>
              <PinMapa avistamento={a} />
            </Pressable>
          );
        })
      }
    />
  );
}

const estilos = StyleSheet.create({
  pin: {
    position: 'absolute',
    cursor: 'pointer',
  },
});
