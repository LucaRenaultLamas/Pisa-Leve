import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  titulo: string;
  onPress: () => void;
  variante?: 'primario' | 'secundario' | 'perigo';
  icone?: NomeIcone;
  carregando?: boolean;
  tituloCarregando?: string;
  desabilitado?: boolean;
};

export function Botao({
  titulo,
  onPress,
  variante = 'primario',
  icone,
  carregando = false,
  tituloCarregando,
  desabilitado = false,
}: Props) {
  const primario = variante === 'primario';
  const perigo = variante === 'perigo';
  const corTexto = primario || perigo ? cores.superficie : cores.primaria;
  const inativo = desabilitado || carregando;

  return (
    <Pressable
      onPress={onPress}
      disabled={inativo}
      accessibilityRole="button"
      accessibilityState={{ disabled: inativo, busy: carregando }}
      style={({ pressed }) => [
        estilos.botao,
        estilos[variante],
        carregando && primario && estilos.primarioCarregando,
        pressed && estilos.pressionado,
        desabilitado && estilos.desabilitado,
      ]}>
      <View style={estilos.conteudo}>
        {carregando && <ActivityIndicator color={corTexto} />}
        <Text style={[estilos.texto, { color: corTexto }]}>
          {carregando && tituloCarregando ? tituloCarregando : titulo}
        </Text>
        {!carregando && icone && <Icone nome={icone} cor={corTexto} tamanho={18} />}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    height: 54,
    borderRadius: raios.lg,
    paddingHorizontal: espacos.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primario: {
    backgroundColor: cores.primaria,
  },
  primarioCarregando: {
    backgroundColor: cores.primariaMedia,
  },
  perigo: {
    backgroundColor: cores.erro,
  },
  secundario: {
    backgroundColor: cores.superficie,
    borderWidth: 1.5,
    borderColor: cores.primariaMedia,
  },
  pressionado: {
    opacity: 0.85,
  },
  desabilitado: {
    opacity: 0.5,
  },
  conteudo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  texto: {
    fontFamily: fontes.negrito,
    fontSize: 16,
  },
});
