import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Circle } from 'react-native-svg';

import { COR_CIRCULO, TAM_PINO, type PropsEscolherPonto } from '@/components/escolherPonto.comum';
import { Icone } from '@/components/Icone';
import { MapaBaseWeb } from '@/components/MapaBaseWeb';
import { cores } from '@/constants/tema';
import { areaEmVolta } from '@/services/trilhas';

// O pino fica parado no meio: arrastar o mapa escolhe o ponto
export function EscolherPonto({ enquadre, raioKm, onMudar }: PropsEscolherPonto) {
  const { centro, raioKm: raioEnquadre } = enquadre;
  const area = useMemo(() => areaEmVolta(centro, raioEnquadre * 1.4), [centro, raioEnquadre]);

  return (
    <View style={estilos.caixa}>
      <MapaBaseWeb
        area={area}
        rotulo="Mapa para escolher o local: arraste para mudar o ponto"
        rotuloCentralizar="Voltar ao ponto inicial"
        aoMover={onMudar}
        camadaSvg={({ largura, altura, kmPorPx }) => (
          <Circle
            cx={largura / 2}
            cy={altura / 2}
            r={raioKm / kmPorPx}
            fill={COR_CIRCULO}
            stroke={cores.primariaMedia}
            strokeWidth={2}
            strokeDasharray="8 6"
          />
        )}
        sobre={({ largura, altura }) => (
          <View
            pointerEvents="none"
            style={[
              estilos.pino,
              { left: largura / 2 - TAM_PINO / 2, top: altura / 2 - TAM_PINO },
            ]}>
            <Icone nome="pinCheio" cor={cores.primaria} tamanho={TAM_PINO} />
          </View>
        )}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.borda,
  },
  pino: {
    position: 'absolute',
    width: TAM_PINO,
    height: TAM_PINO,
  },
});
