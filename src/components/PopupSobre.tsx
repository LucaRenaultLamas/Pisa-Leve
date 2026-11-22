import { useRef, useState, type ComponentRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ChipFiltro } from '@/components/ChipFiltro';
import { Icone } from '@/components/Icone';
import { PARTES_SOBRE } from '@/constants/sobre';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  visivel: boolean;
  onFechar: () => void;
};

export function PopupSobre({ visivel, onFechar }: Props) {
  const [parteId, setParteId] = useState(PARTES_SOBRE[0].id);
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const parte = PARTES_SOBRE.find((p) => p.id === parteId) ?? PARTES_SOBRE[0];

  function escolher(id: string) {
    setParteId(id);
    rolagem.current?.scrollTo({ y: 0, animated: false });
  }

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
              <Text style={estilos.marca}>TRABALHO FINAL · DESENVOLVIMENTO MÓVEL</Text>
              <Text style={estilos.titulo} accessibilityRole="header">
                Sobre o Pisa Leve
              </Text>
            </View>
            <Pressable
              onPress={onFechar}
              accessibilityRole="button"
              accessibilityLabel="Fechar resumo do projeto"
              hitSlop={8}
              style={({ pressed }) => [estilos.fechar, pressed && { opacity: 0.7 }]}>
              <Icone nome="fechar" cor={cores.primaria} tamanho={22} />
            </Pressable>
          </View>

          <View style={estilos.partes} accessibilityRole="radiogroup">
            {PARTES_SOBRE.map((p) => (
              <ChipFiltro
                key={p.id}
                rotulo={p.rotulo}
                ativo={p.id === parte.id}
                onPress={() => escolher(p.id)}
                rotuloAcessivel={`Mostrar: ${p.rotulo}`}
              />
            ))}
          </View>

          <ScrollView ref={rolagem} contentContainerStyle={estilos.conteudo}>
            <Text style={estilos.intro}>{parte.intro}</Text>
            {parte.itens.map((item) => (
              <View key={item.titulo} style={estilos.item}>
                <Text style={estilos.itemTitulo}>{item.titulo}</Text>
                {item.detalhe && <Text style={estilos.itemDetalhe}>{item.detalhe}</Text>}
                <Text style={estilos.itemTexto}>{item.texto}</Text>
                {item.passos?.map((passo, i) => (
                  <View key={passo} style={estilos.passo}>
                    <View style={estilos.passoNumero}>
                      <Text style={estilos.passoNumeroTexto}>{i + 1}</Text>
                    </View>
                    <Text style={[estilos.itemTexto, estilos.passoTexto]}>{passo}</Text>
                  </View>
                ))}
              </View>
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
    gap: 4,
  },
  marca: {
    fontFamily: fontes.monoNegrito,
    fontSize: 10,
    letterSpacing: 1.2,
    color: cores.primariaMedia,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 20,
    color: cores.primaria,
  },
  fechar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.selecionado,
  },
  partes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
    paddingHorizontal: espacos.xs,
  },
  conteudo: {
    gap: espacos.sm,
    paddingBottom: espacos.xs,
  },
  intro: {
    fontFamily: fontes.media,
    fontSize: 14,
    lineHeight: 20,
    color: cores.texto,
    paddingHorizontal: espacos.xs,
    paddingBottom: espacos.xs,
  },
  item: {
    gap: 4,
    padding: espacos.md,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  itemTitulo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  itemDetalhe: {
    fontFamily: fontes.mono,
    fontSize: 12,
    color: cores.primariaMedia,
  },
  itemTexto: {
    fontFamily: fontes.regular,
    fontSize: 13,
    lineHeight: 19,
    color: cores.textoSecundario,
  },
  passo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacos.sm,
    marginTop: espacos.xs,
  },
  passoNumero: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.selecionado,
  },
  passoNumeroTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 12,
    color: cores.primaria,
  },
  passoTexto: {
    flex: 1,
    paddingTop: 1,
  },
});
