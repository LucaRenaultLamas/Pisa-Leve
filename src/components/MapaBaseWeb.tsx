import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Image,
  Linking,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';
import Svg from 'react-native-svg';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes } from '@/constants/tema';
import type { Coordenadas } from '@/services/localizacao';
import type { Area } from '@/services/trilhas';

const TAM_TILE = 256;
const CIRCUNFERENCIA_KM = 40075;
const MARGEM_PX = 24;
const ZOOM_MIN = 3;
const ZOOM_MAX = 18; // o servidor de tiles do OSM vai até 19

type Vista = { centro: Coordenadas; zoom: number };

export type ContextoMapa = {
  naTela: (p: Coordenadas) => { x: number; y: number };
  kmPorPx: number;
  largura: number;
  altura: number;
};

type Props = {
  area: Area; // o que aparece inteiro ao abrir e ao tocar na mira
  rotulo: string;
  rotuloCentralizar: string;
  camadaSvg?: (mapa: ContextoMapa) => ReactNode; // desenho por baixo dos pins
  sobre?: (mapa: ContextoMapa) => ReactNode; // pins e outros tocáveis
  aoMover?: (centro: Coordenadas) => void; // centro da tela, a cada mudança
};

// Só existem no react-native-web: sem touchAction o celular rola a página em vez de arrastar o mapa
const ARRASTAVEL = { touchAction: 'none', cursor: 'grab' } as unknown as ViewStyle;

// Web Mercator: coordenada -> pixel no "mundo" do zoom (o mesmo esquema dos tiles do OSM)
function paraPixel({ latitude, longitude }: Coordenadas, zoom: number) {
  const mundo = TAM_TILE * 2 ** zoom;
  const lat = (latitude * Math.PI) / 180;
  return {
    x: ((longitude + 180) / 360) * mundo,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * mundo,
  };
}

function paraCoordenada(x: number, y: number, zoom: number): Coordenadas {
  const mundo = TAM_TILE * 2 ** zoom;
  return {
    latitude: (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / mundo))) * 180) / Math.PI,
    longitude: (x / mundo) * 360 - 180,
  };
}

const limitar = (zoom: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoom));

// Centro e zoom (com fração) em que a área cabe na caixa
function enquadrar(area: Area, largura: number, altura: number): Vista {
  const a = paraPixel({ latitude: area.norte, longitude: area.oeste }, 0);
  const b = paraPixel({ latitude: area.sul, longitude: area.leste }, 0);
  const escala = Math.min(
    (largura - MARGEM_PX * 2) / Math.max(b.x - a.x, 1e-9),
    (altura - MARGEM_PX * 2) / Math.max(b.y - a.y, 1e-9),
  );
  return {
    centro: paraCoordenada((a.x + b.x) / 2, (a.y + b.y) / 2, 0),
    zoom: limitar(Math.log2(escala)),
  };
}

// react-native-maps não roda na web: aqui o mapa é montado com os tiles do OpenStreetMap
export function MapaBaseWeb({ area, rotulo, rotuloCentralizar, camadaSvg, sobre, aoMover }: Props) {
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });
  const { largura, altura } = tamanho;
  // null = enquadrado na área; vira Vista quando a pessoa mexe
  const [vista, setVista] = useState<Vista | null>(null);
  const caixa = useRef<ComponentRef<typeof View>>(null);

  const chaveArea = `${area.sul},${area.oeste},${area.norte},${area.leste}`;
  useEffect(() => setVista(null), [chaveArea]);

  const atual: Vista =
    vista ??
    (largura > 0
      ? enquadrar(area, largura, altura)
      : { centro: { latitude: 0, longitude: 0 }, zoom: ZOOM_MIN });
  const meio = paraPixel(atual.centro, atual.zoom);
  const esquerda = meio.x - largura / 2;
  const topo = meio.y - altura / 2;
  const naTela = (p: Coordenadas) => {
    const px = paraPixel(p, atual.zoom);
    return { x: px.x - esquerda, y: px.y - topo };
  };

  const avisarMudanca = useRef(aoMover);
  avisarMudanca.current = aoMover;
  const { latitude: latCentro, longitude: lonCentro } = atual.centro;
  useEffect(() => {
    if (largura > 0) avisarMudanca.current?.({ latitude: latCentro, longitude: lonCentro });
  }, [latCentro, lonCentro, largura]);

  // Ref pros handlers (arrasto e roda do mouse) sempre lerem a vista de agora
  const agora = useRef({ atual, largura, altura });
  agora.current = { atual, largura, altura };

  // Mantém parado o ponto da tela (sx, sy) enquanto o zoom muda
  function zoomEm(novoZoom: number, sx: number, sy: number) {
    const { atual: v, largura: l, altura: a } = agora.current;
    const z = limitar(novoZoom);
    const m = paraPixel(v.centro, v.zoom);
    const alvo = paraCoordenada(m.x - l / 2 + sx, m.y - a / 2 + sy, v.zoom);
    const alvoNovo = paraPixel(alvo, z);
    setVista({
      centro: paraCoordenada(alvoNovo.x - sx + l / 2, alvoNovo.y - sy + a / 2, z),
      zoom: z,
    });
  }

  const inicioArrasto = useRef<{ x: number; y: number; zoom: number } | null>(null);
  const arrasto = useRef(
    PanResponder.create({
      // Só pega o gesto quando mexe: toque parado continua abrindo o pin
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) + Math.abs(g.dy) > 4,
      onPanResponderGrant: () => {
        const { atual: v } = agora.current;
        inicioArrasto.current = { ...paraPixel(v.centro, v.zoom), zoom: v.zoom };
      },
      onPanResponderMove: (_, g) => {
        const inicio = inicioArrasto.current;
        if (!inicio) return;
        setVista({
          centro: paraCoordenada(inicio.x - g.dx, inicio.y - g.dy, inicio.zoom),
          zoom: inicio.zoom,
        });
      },
      onPanResponderRelease: () => {
        inicioArrasto.current = null;
      },
    }),
  ).current;

  // Roda do mouse: na web o ref é o próprio <div>
  useEffect(() => {
    const elemento = caixa.current as unknown as HTMLElement | null;
    if (!elemento?.addEventListener) return;
    const aoRolar = (e: WheelEvent) => {
      e.preventDefault(); // senão a página rola junto
      const r = elemento.getBoundingClientRect();
      const passo = e.deltaY < 0 ? 0.5 : -0.5;
      zoomEm(agora.current.atual.zoom + passo, e.clientX - r.left, e.clientY - r.top);
    };
    elemento.addEventListener('wheel', aoRolar, { passive: false });
    return () => elemento.removeEventListener('wheel', aoRolar);
  }, []);

  const kmPorPx =
    (CIRCUNFERENCIA_KM * Math.cos((atual.centro.latitude * Math.PI) / 180)) /
    (TAM_TILE * 2 ** atual.zoom);
  const mapa: ContextoMapa = { naTela, kmPorPx, largura, altura };

  // Tile só existe em zoom inteiro: pega o de baixo e estica pra fração que falta
  const zoomTile = Math.floor(atual.zoom);
  const lado = TAM_TILE * 2 ** (atual.zoom - zoomTile);
  const tiles: { chave: string; url: string; x: number; y: number }[] = [];
  if (largura > 0) {
    const limite = 2 ** zoomTile;
    for (let tx = Math.floor(esquerda / lado); tx * lado < esquerda + largura; tx++) {
      for (let ty = Math.floor(topo / lado); ty * lado < topo + altura; ty++) {
        if (ty < 0 || ty >= limite) continue;
        tiles.push({
          chave: `${zoomTile}/${tx}/${ty}`,
          url: `https://tile.openstreetmap.org/${zoomTile}/${((tx % limite) + limite) % limite}/${ty}.png`,
          x: tx * lado - esquerda,
          y: ty * lado - topo,
        });
      }
    }
  }

  return (
    <View
      ref={caixa}
      style={[estilos.caixa, ARRASTAVEL]}
      onLayout={(e) =>
        setTamanho({ largura: e.nativeEvent.layout.width, altura: e.nativeEvent.layout.height })
      }
      accessibilityLabel={rotulo}
      {...arrasto.panHandlers}>
      {tiles.map((t) => (
        <Image
          key={t.chave}
          source={{ uri: t.url }}
          style={{ position: 'absolute', left: t.x, top: t.y, width: lado, height: lado }}
          aria-hidden
        />
      ))}

      {largura > 0 && (
        <>
          {camadaSvg && (
            <Svg width={largura} height={altura} style={StyleSheet.absoluteFill} aria-hidden>
              {camadaSvg(mapa)}
            </Svg>
          )}

          {sobre?.(mapa)}

          <View style={estilos.controles}>
            <BotaoMapa
              icone="mais"
              rotulo="Aproximar o mapa"
              onPress={() => zoomEm(atual.zoom + 1, largura / 2, altura / 2)}
            />
            <BotaoMapa
              icone="menos"
              rotulo="Afastar o mapa"
              onPress={() => zoomEm(atual.zoom - 1, largura / 2, altura / 2)}
            />
            {vista && (
              <BotaoMapa icone="mira" rotulo={rotuloCentralizar} onPress={() => setVista(null)} />
            )}
          </View>

          <Pressable
            onPress={() => Linking.openURL('https://www.openstreetmap.org/copyright')}
            accessibilityRole="link"
            style={estilos.credito}>
            <Text style={estilos.creditoTexto}>© OpenStreetMap</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function BotaoMapa({
  icone,
  rotulo,
  onPress,
}: {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      style={({ pressed }) => [estilos.botao, pressed && { opacity: 0.8 }]}>
      <Icone nome={icone} cor={cores.primaria} tamanho={20} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: cores.mapaFundo,
    userSelect: 'none',
  },
  controles: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  botao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(20, 38, 28, 0.2)',
  },
  credito: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderTopLeftRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
  },
  creditoTexto: {
    fontFamily: fontes.regular,
    fontSize: 10,
    color: cores.textoSecundario,
  },
});
