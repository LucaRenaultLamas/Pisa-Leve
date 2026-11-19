import { Pressable, StyleSheet, Text, View } from 'react-native';

import CurvasDeNivel from '@/assets/svg/curvas-de-nivel.svg';
import { Icone } from '@/components/Icone';
import { SimboloPisaLeve } from '@/components/SimboloPisaLeve';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  rotulo: string;
  titulo: string;
  subtitulo: string;
  onVoltar?: () => void;
};

export function CabecalhoAcesso({ rotulo, titulo, subtitulo, onVoltar }: Props) {
  return (
    <View style={estilos.cabecalho}>
      <CurvasDeNivel style={StyleSheet.absoluteFill} width="100%" height="100%" aria-hidden />

      {onVoltar ? (
        <Pressable
          onPress={onVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          hitSlop={8}
          style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.7 }]}>
          <Icone nome="voltar" cor={cores.superficie} tamanho={22} />
        </Pressable>
      ) : (
        <View style={estilos.marca}>
          <SimboloPisaLeve altura={36} corFundo={cores.selecionado} />
        </View>
      )}

      <View style={estilos.textos}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.titulo} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={estilos.subtitulo}>{subtitulo}</Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cabecalho: {
    paddingTop: espacos.xl,
    paddingHorizontal: espacos.xxl,
    paddingBottom: 40,
    gap: 14,
    overflow: 'hidden',
  },
  marca: {
    width: 52,
    height: 52,
    borderRadius: raios.lg,
    backgroundColor: cores.selecionado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voltar: {
    width: 44,
    height: 44,
    marginLeft: -10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    gap: 6,
  },
  rotulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.selecionado,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 28,
    lineHeight: 32,
    color: cores.superficie,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 21,
    color: cores.selecionado,
    maxWidth: 280,
  },
});
