import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone } from '@/components/Icone';
import { cores, fontes } from '@/constants/tema';

type Props = {
  visivel: boolean;
  fotos: string[];
  inicial: number; // foto que estava aparecendo quando tocou
  titulo: string;
  credito: string | null;
  onFechar: () => void;
};

// Foto em tela cheia, inteira (sem cortar), passando pro lado entre as fotos
export function PopupFoto({ visivel, fotos, inicial, titulo, credito, onFechar }: Props) {
  const { width: largura } = useWindowDimensions();
  const margens = useSafeAreaInsets();
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const [atual, setAtual] = useState(inicial);

  // Abre já na foto tocada
  useEffect(() => {
    if (!visivel) return;
    setAtual(inicial);
    requestAnimationFrame(() =>
      rolagem.current?.scrollTo({ x: inicial * largura, animated: false }),
    );
  }, [visivel, inicial, largura]);

  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onFechar}>
      <View style={estilos.fundo} accessibilityViewIsModal>
        <ScrollView
          ref={rolagem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={(e) => setAtual(Math.round(e.nativeEvent.contentOffset.x / largura))}
          scrollEventThrottle={100}
          style={StyleSheet.absoluteFill}>
          {fotos.map((url, i) => (
            // Tocar fora da foto (no escuro) também fecha
            <Pressable
              key={url}
              onPress={onFechar}
              accessibilityLabel={`Foto ${i + 1} de ${fotos.length} de ${titulo}. Toque para fechar`}
              style={[estilos.pagina, { width: largura }]}>
              <Image
                // "large" (1024 px) no lugar da "medium" da tela de detalhes
                source={{ uri: url.replace('/medium.', '/large.') }}
                style={estilos.foto}
                resizeMode="contain"
              />
            </Pressable>
          ))}
        </ScrollView>

        <View style={[estilos.topo, { paddingTop: margens.top + 12 }]} pointerEvents="box-none">
          <Text style={estilos.titulo} numberOfLines={1}>
            {titulo}
            {fotos.length > 1 ? `  ·  ${atual + 1}/${fotos.length}` : ''}
          </Text>
          <Pressable
            onPress={onFechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar foto"
            hitSlop={8}
            style={({ pressed }) => [estilos.fechar, pressed && { opacity: 0.7 }]}>
            <Icone nome="fechar" cor={cores.superficie} tamanho={24} />
          </Pressable>
        </View>

        {!!credito && (
          <Text
            style={[estilos.credito, { paddingBottom: margens.bottom + 12 }]}
            pointerEvents="none">
            Foto: {credito}
          </Text>
        )}
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(10, 20, 14, 0.94)',
  },
  pagina: {
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
  },
  foto: {
    width: '100%',
    height: '100%',
  },
  topo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  titulo: {
    flex: 1,
    fontFamily: fontes.semiNegrito,
    fontSize: 15,
    color: cores.superficie,
  },
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  credito: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    textAlign: 'center',
    fontFamily: fontes.regular,
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
});
