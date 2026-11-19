import { StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  titulo: string;
  mensagem?: string;
};

export function AvisoErro({ titulo, mensagem }: Props) {
  return (
    <View style={estilos.aviso} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icone nome="alerta" cor={cores.erro} />
      <View style={estilos.textos}>
        <Text style={estilos.titulo}>{titulo}</Text>
        {!!mensagem && <Text style={estilos.mensagem}>{mensagem}</Text>}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: espacos.md,
    paddingHorizontal: 14,
    borderRadius: raios.campo,
    borderWidth: 1.5,
    borderColor: cores.erroBorda,
    backgroundColor: cores.erroFundo,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fontes.negrito,
    fontSize: 14,
    color: cores.erroTexto,
  },
  mensagem: {
    fontFamily: fontes.regular,
    fontSize: 13,
    lineHeight: 18,
    color: cores.erroTexto,
  },
});
