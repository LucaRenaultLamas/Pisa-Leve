import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CartaoAvistamento } from '@/components/CartaoAvistamento';
import { Icone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import type { Avistamento } from '@/services/inaturalist';

type Props = {
  visivel: boolean;
  titulo: string;
  avistamentos: Avistamento[];
  total: number; // no raio todo; a lista só traz os mais recentes
  onAbrir: (avistamento: Avistamento) => void;
  onFechar: () => void;
};

export function PopupAvistamentos({
  visivel,
  titulo,
  avistamentos,
  total,
  onAbrir,
  onFechar,
}: Props) {
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onFechar}>
      <View style={estilos.fundo}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onFechar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />
        <View style={estilos.caixa} accessibilityViewIsModal>
          <View style={estilos.topo}>
            <View style={estilos.titulos}>
              <Text style={estilos.titulo} accessibilityRole="header">
                {titulo}
              </Text>
              <Text style={estilos.subtitulo}>
                {avistamentos.length < total
                  ? `Os ${avistamentos.length} mais recentes de ${total} no raio`
                  : `${avistamentos.length} ${avistamentos.length === 1 ? 'avistamento' : 'avistamentos'}`}
              </Text>
            </View>
            <Pressable
              onPress={onFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar lista de avistamentos"
              hitSlop={8}
              style={({ pressed }) => [estilos.fechar, pressed && { opacity: 0.7 }]}>
              <Icone nome="fechar" cor={cores.primaria} tamanho={22} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={estilos.grade}>
            {avistamentos.map((a) => (
              <CartaoAvistamento
                key={a.id}
                avistamento={a}
                onPress={() => {
                  onFechar();
                  onAbrir(a);
                }}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fundo: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: espacos.lg,
    backgroundColor: 'rgba(20, 38, 28, 0.55)',
  },
  caixa: {
    width: '100%',
    maxWidth: 560,
    maxHeight: '88%',
    paddingTop: espacos.xl,
    paddingHorizontal: espacos.lg,
    paddingBottom: espacos.lg,
    gap: espacos.md,
    borderRadius: raios.folha,
    backgroundColor: cores.fundo,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacos.md,
    paddingHorizontal: espacos.xs,
  },
  titulos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 18,
    color: cores.primaria,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  fechar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.selecionado,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: espacos.xs,
  },
});
