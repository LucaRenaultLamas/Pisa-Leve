import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes, raios } from '@/constants/tema';
import type { RegistroLocal } from '@/services/locais';
import { formatarDistancia, tempoAtras } from '@/utils/geo';

type Props = {
  registro: RegistroLocal;
  onPress: (registro: RegistroLocal) => void;
};

type Selo = { texto: string; icone: NomeIcone; fundo: string; cor: string };

// Registro de um local monitorado (aba Alertas)
export const CartaoRegistro = memo(function CartaoRegistro({ registro, onPress }: Props) {
  const { nome, nomeCientifico, foto, novo, peconhento, alergia, confirmado } = registro;
  const quando = registro.data ? `visto ${tempoAtras(registro.data)}` : 'sem data';
  const detalhe = `a ${formatarDistancia(registro.distanciaKm)} · ${quando}`;

  const selos: Selo[] = [];
  if (novo) {
    selos.push({ texto: 'Novo', icone: 'sino', fundo: cores.primaria, cor: cores.superficie });
  }
  if (peconhento) {
    selos.push({
      texto: 'Peçonhento',
      icone: 'perigo',
      fundo: cores.perigoFundo,
      cor: cores.perigoTexto,
    });
  }
  if (alergia) {
    selos.push({
      texto: 'Sua alergia',
      icone: 'alerta',
      fundo: cores.avisoFundo,
      cor: cores.avisoTexto,
    });
  }
  if (!confirmado) {
    selos.push({
      texto: 'Não confirmado',
      icone: 'info',
      fundo: cores.selecionado,
      cor: cores.textoSecundario,
    });
  }

  return (
    <Pressable
      onPress={() => onPress(registro)}
      accessibilityRole="link"
      accessibilityLabel={[nome, ...selos.map((s) => s.texto), detalhe].join(', ')}
      style={({ pressed }) => [
        estilos.cartao,
        novo && estilos.cartaoNovo,
        pressed && estilos.pressionado,
      ]}>
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
        {nome !== nomeCientifico && (
          <Text style={estilos.cientifico} numberOfLines={1}>
            {nomeCientifico}
          </Text>
        )}
        <View style={estilos.selos}>
          {selos.map((s) => (
            <View key={s.texto} style={[estilos.selo, { backgroundColor: s.fundo }]}>
              <Icone nome={s.icone} cor={s.cor} tamanho={12} />
              <Text style={[estilos.seloTexto, { color: s.cor }]}>{s.texto}</Text>
            </View>
          ))}
        </View>
        <Text style={estilos.detalhe} numberOfLines={1}>
          {detalhe}
        </Text>
      </View>

      <Icone nome="avancar" cor={cores.bordaForte} tamanho={18} />
    </Pressable>
  );
});

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
  cartaoNovo: {
    borderColor: cores.primariaClara,
    borderWidth: 1.5,
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
    fontStyle: 'italic',
    fontSize: 12,
    color: cores.textoSecundario,
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
