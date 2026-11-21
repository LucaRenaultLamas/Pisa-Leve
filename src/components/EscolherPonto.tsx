import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Circle } from 'react-native-maps';

import { COR_CIRCULO, TAM_PINO, type PropsEscolherPonto } from '@/components/escolherPonto.comum';
import { Icone } from '@/components/Icone';
import { cores } from '@/constants/tema';
import type { Coordenadas } from '@/services/localizacao';

function regiao(centro: Coordenadas, raioKm: number) {
  const delta = (raioKm * 2.8) / 111.32;
  return { ...centro, latitudeDelta: delta, longitudeDelta: delta };
}

// Na web entra o EscolherPonto.web.tsx. O pino fica parado no meio: arrastar o mapa escolhe o ponto
export function EscolherPonto({ enquadre, ponto, raioKm, onMudar }: PropsEscolherPonto) {
  const mapa = useRef<MapView>(null);
  const primeira = useRef(regiao(enquadre.centro, enquadre.raioKm));

  useEffect(() => {
    mapa.current?.animateToRegion(regiao(enquadre.centro, enquadre.raioKm), 300);
  }, [enquadre]);

  return (
    <View style={estilos.caixa}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={primeira.current}
        onRegionChangeComplete={(r) => onMudar({ latitude: r.latitude, longitude: r.longitude })}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        accessibilityLabel="Mapa para escolher o local: arraste para mudar o ponto">
        <Circle
          center={ponto}
          radius={raioKm * 1000}
          strokeColor={cores.primariaMedia}
          strokeWidth={2}
          lineDashPattern={[8, 6]}
          fillColor={COR_CIRCULO}
        />
      </MapView>
      <View style={estilos.meio} pointerEvents="none">
        <View style={estilos.pino}>
          <Icone nome="pinCheio" cor={cores.primaria} tamanho={TAM_PINO} />
        </View>
      </View>
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
  meio: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // A ponta do ícone fica no centro do mapa
  pino: {
    width: TAM_PINO,
    height: TAM_PINO,
    marginTop: -TAM_PINO,
  },
});
