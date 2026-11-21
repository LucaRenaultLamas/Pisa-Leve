import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';

import { Icone } from '@/components/Icone';
import { descricaoPin, PinMapa } from '@/components/PinMapa';
import type { PropsMapaAvistamentos } from '@/components/mapaAvistamentos.tipos';
import { cores } from '@/constants/tema';
import { formatarDistancia, tempoAtras } from '@/utils/geo';

// Círculo inteiro com uma folguinha
function regiaoDoRaio(
  { latitude, longitude }: PropsMapaAvistamentos['centro'],
  raioKm: number,
): Region {
  const delta = ((raioKm * 2) / 111) * 1.25;
  return { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta };
}

// Na web entra o MapaAvistamentos.web.tsx
export function MapaAvistamentos({
  centro,
  raioKm,
  avistamentos,
  onAbrir,
  centroEhVoce = true,
}: PropsMapaAvistamentos) {
  const mapa = useRef<MapView>(null);

  useEffect(() => {
    mapa.current?.animateToRegion(regiaoDoRaio(centro, raioKm), 400);
  }, [centro, raioKm]);

  return (
    <View style={estilos.caixa}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        initialRegion={regiaoDoRaio(centro, raioKm)}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        accessibilityLabel={`Mapa com ${avistamentos.length} avistamentos perto ${centroEhVoce ? 'de você' : 'do local'}`}>
        <Circle
          center={centro}
          radius={raioKm * 1000}
          strokeColor={cores.primariaMedia}
          strokeWidth={1.5}
          fillColor="rgba(43, 106, 75, 0.08)"
        />

        {avistamentos.map((a) => (
          <Marker
            key={a.id}
            coordinate={a.coordenadas}
            title={a.nome}
            description={`${descricaoPin(a)} · ${formatarDistancia(a.distanciaKm)} · ${tempoAtras(a.data)}`}
            onCalloutPress={() => onAbrir(a)}
            anchor={{ x: 0.5, y: 1 }}>
            <PinMapa avistamento={a} />
          </Marker>
        ))}
      </MapView>

      <Pressable
        onPress={() => mapa.current?.animateToRegion(regiaoDoRaio(centro, raioKm), 400)}
        accessibilityRole="button"
        accessibilityLabel={centroEhVoce ? 'Centralizar no meu local' : 'Centralizar no local'}
        style={({ pressed }) => [estilos.centralizar, pressed && { opacity: 0.8 }]}>
        <Icone nome="mira" cor={cores.primaria} tamanho={22} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flex: 1,
  },
  centralizar: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(20, 38, 28, 0.2)',
  },
});
