import { useMemo, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Circle, Marker, Polyline } from 'react-native-maps';

import { Icone } from '@/components/Icone';
import { COR_RISCO } from '@/components/MiniTrilha';
import {
  areaDoMapa,
  corDoRegistro,
  linhasColoridas,
  TRACEJADO,
  type PropsMapaTrilha,
} from '@/components/mapaTrilha.comum';
import { cores } from '@/constants/tema';
import type { Area } from '@/services/trilhas';

const MARGEM = { top: 40, right: 40, bottom: 40, left: 40 };

function cantos(area: Area) {
  return [
    { latitude: area.norte, longitude: area.oeste },
    { latitude: area.sul, longitude: area.leste },
  ];
}

// Na web entra o MapaTrilha.web.tsx
export function MapaTrilha({ trilha, risco, raioSemDesenhoKm, onAbrirRegistro }: PropsMapaTrilha) {
  const mapa = useRef<MapView>(null);
  const area = useMemo(
    () => areaDoMapa(trilha, risco, raioSemDesenhoKm),
    [trilha, risco, raioSemDesenhoKm],
  );
  const linhas = useMemo(() => linhasColoridas(trilha, risco), [trilha, risco]);
  const enquadrar = () =>
    mapa.current?.fitToCoordinates(cantos(area), { edgePadding: MARGEM, animated: true });

  return (
    <View style={estilos.caixa}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        onMapReady={enquadrar}
        showsUserLocation
        showsMyLocationButton={false}
        toolbarEnabled={false}
        accessibilityLabel="Mapa da trilha com o caminho colorido pelo risco de cada trecho">
        {trilha.trechos.length === 0 && (
          <Circle
            center={trilha.inicio}
            radius={raioSemDesenhoKm * 1000}
            strokeColor={risco ? COR_RISCO[risco.nivel] : cores.primariaMedia}
            strokeWidth={2}
            lineDashPattern={TRACEJADO}
            fillColor="rgba(43, 106, 75, 0.08)"
          />
        )}
        {linhas.map(({ pontos }, i) => (
          <Polyline
            key={`fundo${i}`}
            coordinates={pontos}
            strokeColor="rgba(255, 255, 255, 0.85)"
            strokeWidth={8}
          />
        ))}
        {linhas.map(({ pontos, cor }, i) => (
          <Polyline
            key={`linha${i}`}
            coordinates={pontos}
            strokeColor={cor}
            strokeWidth={5}
            lineDashPattern={TRACEJADO}
          />
        ))}
        <Marker coordinate={trilha.inicio} anchor={{ x: 0.5, y: 0.5 }} title="Início da trilha">
          <View style={estilos.inicio} />
        </Marker>
        {risco?.registros.map((r) => (
          <Marker
            key={r.id}
            coordinate={r.ponto}
            anchor={{ x: 0.5, y: 0.5 }}
            title={r.nome}
            description={r.peconhento ? 'Peçonhento' : 'Ligado à sua alergia'}
            onCalloutPress={() => onAbrirRegistro(r)}
            tracksViewChanges={false}>
            <View style={[estilos.bolinha, { backgroundColor: corDoRegistro(r) }]} />
          </Marker>
        ))}
      </MapView>

      <Pressable
        onPress={enquadrar}
        accessibilityRole="button"
        accessibilityLabel="Mostrar a trilha inteira"
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
  inicio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: cores.superficie,
    backgroundColor: cores.primaria,
  },
  bolinha: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: cores.superficie,
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
