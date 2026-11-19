import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  rotulo: string;
  marcado: boolean;
  onPress: () => void;
  // 'remover' troca o ✓ por um ✕ (itens que a pessoa mesma adicionou)
  acao?: 'marcar' | 'remover';
};

// Opção em forma de etiqueta, para listas que quebram linha
export function ChipSelecao({ rotulo, marcado, onPress, acao = 'marcar' }: Props) {
  const remover = acao === 'remover';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={remover ? 'button' : 'checkbox'}
      accessibilityState={remover ? undefined : { checked: marcado }}
      accessibilityLabel={remover ? `Remover ${rotulo}` : rotulo}
      style={({ pressed }) => [
        estilos.chip,
        marcado && estilos.chipMarcado,
        pressed && estilos.pressionado,
      ]}>
      {remover ? (
        <Icone nome="fechar" cor={cores.primaria} tamanho={16} />
      ) : (
        <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
          {marcado && <Icone nome="check" cor={cores.superficie} tamanho={13} />}
        </View>
      )}
      <Text style={[estilos.rotulo, marcado && estilos.rotuloMarcado]}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.sm,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: raios.md,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  chipMarcado: {
    borderColor: cores.primariaMedia,
    backgroundColor: cores.selecionado,
  },
  pressionado: {
    opacity: 0.8,
  },
  caixa: {
    width: 18,
    height: 18,
    borderRadius: 5,
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
    fontFamily: fontes.media,
    fontSize: 14,
    color: cores.texto,
  },
  rotuloMarcado: {
    fontFamily: fontes.semiNegrito,
  },
});
