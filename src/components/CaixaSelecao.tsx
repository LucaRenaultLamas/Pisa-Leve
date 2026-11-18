import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { cores, espacos, fontes } from '@/constants/tema';

type Props = {
  rotulo: string;
  marcado: boolean;
  onMudar: (marcado: boolean) => void;
};

export function CaixaSelecao({ rotulo, marcado, onMudar }: Props) {
  return (
    <Pressable
      onPress={() => onMudar(!marcado)}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      style={estilos.linha}>
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado && <Icone nome="check" cor={cores.superficie} tamanho={13} espessura={3} />}
      </View>
      <Text style={estilos.rotulo}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.md - 2,
    minHeight: 44,
    alignSelf: 'flex-start',
  },
  caixa: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixaMarcada: {
    backgroundColor: cores.primaria,
    borderColor: cores.primaria,
  },
  rotulo: {
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.texto,
  },
});
