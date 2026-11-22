import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/Botao';
import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  visivel: boolean;
  titulo: string;
  mensagem: string;
  icone?: NomeIcone;
  textoConfirmar: string;
  textoCancelar?: string; // sem ele, o popup só tem um botão
  perigo?: boolean; // botão de confirmar em vermelho
  onConfirmar: () => void;
  onCancelar: () => void;
};

// Popup no lugar do Alert: mesmo visual no celular e na web
export function PopupConfirmacao({
  visivel,
  titulo,
  mensagem,
  icone,
  textoConfirmar,
  textoCancelar,
  perigo = false,
  onConfirmar,
  onCancelar,
}: Props) {
  return (
    <Modal
      visible={visivel}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancelar}>
      <View style={estilos.fundo}>
        {/* Tocar fora fecha, igual ao Cancelar */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onCancelar}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
        />

        <View style={estilos.caixa} accessibilityViewIsModal>
          {icone && (
            <View style={[estilos.icone, perigo && estilos.iconePerigo]}>
              <Icone nome={icone} cor={perigo ? cores.erro : cores.primaria} tamanho={24} />
            </View>
          )}

          <Text style={estilos.titulo} accessibilityRole="header">
            {titulo}
          </Text>
          <Text style={estilos.mensagem}>{mensagem}</Text>

          <View style={estilos.botoes}>
            <Botao
              titulo={textoConfirmar}
              variante={perigo ? 'perigo' : 'primario'}
              onPress={onConfirmar}
            />
            {textoCancelar && (
              <Botao titulo={textoCancelar} variante="secundario" onPress={onCancelar} />
            )}
          </View>
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
    padding: espacos.xxl,
    backgroundColor: 'rgba(20, 38, 28, 0.55)',
  },
  caixa: {
    width: '100%',
    maxWidth: 360,
    padding: espacos.xxl,
    gap: espacos.md,
    borderRadius: raios.folha,
    backgroundColor: cores.fundo,
    alignItems: 'center',
  },
  icone: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: cores.selecionado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconePerigo: {
    backgroundColor: cores.erroFundo,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 18,
    color: cores.primaria,
    textAlign: 'center',
  },
  mensagem: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 21,
    color: cores.textoSecundario,
    textAlign: 'center',
  },
  botoes: {
    alignSelf: 'stretch',
    gap: espacos.sm,
    marginTop: espacos.sm,
  },
});
