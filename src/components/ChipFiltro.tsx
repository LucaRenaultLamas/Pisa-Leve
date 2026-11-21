import { Pressable, StyleSheet, Text } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes } from '@/constants/tema';

type Props = {
  rotulo: string;
  ativo: boolean;
  onPress: () => void;
  icone?: NomeIcone;
  tom?: 'normal' | 'aviso';
  rotuloAcessivel?: string; // padrão: "Filtrar: <rótulo>"
};

export function ChipFiltro({
  rotulo,
  ativo,
  onPress,
  icone,
  tom = 'normal',
  rotuloAcessivel,
}: Props) {
  const aviso = tom === 'aviso';
  const corTexto = ativo ? cores.superficie : aviso ? cores.avisoTexto : cores.texto;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: ativo }}
      accessibilityLabel={rotuloAcessivel ?? `Filtrar: ${rotulo}`}
      style={({ pressed }) => [
        estilos.chip,
        aviso && estilos.aviso,
        ativo && (aviso ? estilos.avisoAtivo : estilos.ativo),
        pressed && estilos.pressionado,
      ]}>
      {icone && <Icone nome={icone} cor={corTexto} tamanho={15} />}
      <Text style={[estilos.rotulo, { color: corTexto }]}>{rotulo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  ativo: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria,
  },
  aviso: {
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
  },
  avisoAtivo: {
    borderColor: cores.avisoTexto,
    backgroundColor: cores.avisoTexto,
  },
  pressionado: {
    opacity: 0.8,
  },
  rotulo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
  },
});
