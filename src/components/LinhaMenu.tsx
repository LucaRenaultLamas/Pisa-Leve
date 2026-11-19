import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, espacos, fontes } from '@/constants/tema';

type Props = {
  icone: NomeIcone;
  titulo: string;
  valor?: string; // contagem à direita, tipo "4"
  perigo?: boolean; // vermelho e sem seta (ex.: Sair)
  primeira?: boolean; // sem a linha divisória de cima
  onPress: () => void;
};

export function LinhaMenu({ icone, titulo, valor, perigo = false, primeira = false, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={valor ? `${titulo}, ${valor}` : titulo}
      style={({ pressed }) => [estilos.linha, !primeira && estilos.divisoria, pressed && estilos.pressionada]}>
      <View style={[estilos.icone, perigo && estilos.iconePerigo]}>
        <Icone nome={icone} cor={perigo ? cores.erro : cores.primaria} tamanho={18} />
      </View>
      <Text style={[estilos.titulo, perigo && estilos.tituloPerigo]}>{titulo}</Text>
      {valor !== undefined && <Text style={estilos.valor}>{valor}</Text>}
      {!perigo && <Icone nome="avancar" cor={cores.textoSecundario} tamanho={16} />}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.md,
    minHeight: 52,
    paddingVertical: espacos.sm,
  },
  divisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  pressionada: {
    opacity: 0.6,
  },
  icone: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: cores.selecionado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconePerigo: {
    backgroundColor: cores.erroFundo,
  },
  titulo: {
    flex: 1,
    fontFamily: fontes.media,
    fontSize: 15,
    color: cores.texto,
  },
  tituloPerigo: {
    color: cores.erro,
  },
  valor: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
});
