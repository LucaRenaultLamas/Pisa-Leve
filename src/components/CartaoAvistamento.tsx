import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { cores, fontes, raios } from '@/constants/tema';
import type { Avistamento } from '@/services/inaturalist';
import { formatarDistancia, tempoAtras } from '@/utils/geo';

type Props = {
  avistamento: Avistamento;
  onPress: () => void;
  // Sem largura = ocupa a coluna da grade
  largura?: number;
};

export function CartaoAvistamento({ avistamento, onPress, largura }: Props) {
  const { nome, foto, alergia, peconhento, distanciaKm, data } = avistamento;
  const detalhe = `${formatarDistancia(distanciaKm)} · ${tempoAtras(data)}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${nome}${peconhento ? ', peçonhento' : ''}${alergia ? ', ligado à sua alergia' : ''}, ${detalhe}`}
      style={({ pressed }) => [
        estilos.cartao,
        largura ? { width: largura } : estilos.cartaoGrade,
        pressed && estilos.pressionado,
      ]}>
      {foto ? (
        <Image source={foto} style={estilos.foto} contentFit="cover" transition={150} />
      ) : (
        <View style={[estilos.foto, estilos.semFoto]}>
          <Icone nome="foto" cor={cores.primaria} tamanho={26} />
        </View>
      )}

      <View style={estilos.textos}>
        {/* Espaço da etiqueta fica reservado mesmo vazio: todos os cartões com a mesma altura */}
        <View style={estilos.etiquetas}>
          {peconhento && (
            <Etiqueta texto="Peçonhento" fundo={cores.perigoFundo} cor={cores.perigoTexto} />
          )}
          {alergia && (
            // As duas juntas não cabem numa linha: a de alergia vira só o ícone
            <Etiqueta
              texto={peconhento ? null : 'Sua alergia'}
              fundo={cores.avisoFundo}
              cor={cores.avisoTexto}
            />
          )}
        </View>
        <Text style={estilos.nome} numberOfLines={2}>
          {nome}
        </Text>
        <Text style={estilos.detalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>
    </Pressable>
  );
}

function Etiqueta({ texto, fundo, cor }: { texto: string | null; fundo: string; cor: string }) {
  return (
    <View style={[estilos.etiqueta, { backgroundColor: fundo }]}>
      <Icone nome="alerta" cor={cor} tamanho={13} />
      {texto && <Text style={[estilos.etiquetaTexto, { color: cor }]}>{texto}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  etiquetas: {
    flexDirection: 'row',
    gap: 4,
    height: 21,
    overflow: 'hidden',
  },
  cartao: {
    padding: 8,
    gap: 6,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  cartaoGrade: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  pressionado: {
    opacity: 0.85,
  },
  foto: {
    width: '100%',
    height: 96,
    borderRadius: 10,
    backgroundColor: cores.fotoVazia,
  },
  semFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    alignSelf: 'stretch',
    paddingHorizontal: 4,
    paddingBottom: 4,
    gap: 4,
    alignItems: 'flex-start',
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  etiquetaTexto: {
    fontFamily: fontes.negrito,
    fontSize: 11,
  },
  // Altura de 2 linhas sempre, mesmo com nome curto
  nome: {
    height: 38,
    fontFamily: fontes.negrito,
    fontSize: 14,
    lineHeight: 19,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
});
