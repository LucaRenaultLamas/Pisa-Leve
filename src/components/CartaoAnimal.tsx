import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { perigoDe } from '@/constants/perigos';
import { cores, fontes, raios } from '@/constants/tema';
import type { AnimalBusca } from '@/services/buscaAnimais';

type Props = {
  animal: AnimalBusca;
  alergia: boolean;
  detalhe: string; // ex.: "12 registros perto de você"
  onPress: (animal: AnimalBusca) => void;
};

export const CartaoAnimal = memo(function CartaoAnimal({
  animal,
  alergia,
  detalhe,
  onPress,
}: Props) {
  const { nome, nomeCientifico, nivel, foto } = animal;
  const perigo = perigoDe(animal.ancestrais);
  const grave = perigo?.nivel === 'grave';
  const descricao = [
    nome,
    nome !== nomeCientifico ? nomeCientifico : null,
    nivel,
    perigo?.selo,
    alergia ? 'ligado à sua alergia' : null,
    detalhe,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={() => onPress(animal)}
      accessibilityRole="link"
      accessibilityLabel={descricao}
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
      {foto ? (
        <Image source={foto} style={estilos.foto} contentFit="cover" transition={150} />
      ) : (
        <View style={[estilos.foto, estilos.semFoto]}>
          <Icone nome="foto" cor={cores.primaria} tamanho={22} />
        </View>
      )}

      <View style={estilos.textos}>
        <Text style={estilos.nome} numberOfLines={1}>
          {nome}
        </Text>
        <Text style={estilos.cientifico} numberOfLines={1}>
          {nivel ? `${nivel} · ` : ''}
          {nome !== nomeCientifico ? (
            <Text style={estilos.italico}>{nomeCientifico}</Text>
          ) : (
            'Sem nome popular em português'
          )}
        </Text>
        {(perigo || alergia) && (
          <View style={estilos.selos}>
            {perigo && (
              <Selo
                icone="perigo"
                texto={perigo.selo}
                fundo={grave ? cores.perigoFundo : cores.avisoFundo}
                cor={grave ? cores.perigoTexto : cores.avisoTexto}
              />
            )}
            {alergia && (
              <Selo
                icone="alerta"
                texto="Sua alergia"
                fundo={cores.avisoFundo}
                cor={cores.avisoTexto}
              />
            )}
          </View>
        )}
        <Text style={estilos.detalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>

      <Icone nome="avancar" cor={cores.bordaForte} tamanho={18} />
    </Pressable>
  );
});

function Selo({
  icone,
  texto,
  fundo,
  cor,
}: {
  icone: NomeIcone;
  texto: string;
  fundo: string;
  cor: string;
}) {
  return (
    <View style={[estilos.selo, { backgroundColor: fundo }]}>
      <Icone nome={icone} cor={cor} tamanho={12} />
      <Text style={[estilos.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  pressionado: {
    opacity: 0.85,
  },
  foto: {
    width: 64,
    height: 64,
    borderRadius: raios.md,
    backgroundColor: cores.fotoVazia,
  },
  semFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nome: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    color: cores.texto,
  },
  cientifico: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  italico: {
    fontStyle: 'italic',
  },
  selos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  seloTexto: {
    fontFamily: fontes.negrito,
    fontSize: 11,
  },
  detalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
});
