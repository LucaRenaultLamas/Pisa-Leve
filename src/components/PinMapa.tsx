import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { PINS } from '@/constants/animais';
import { cores, fontes } from '@/constants/tema';
import type { Avistamento } from '@/services/inaturalist';

const LADO = 38;
// Girado, o quadrado ocupa a diagonal; a caixa cabe ele inteiro e a ponta fica bem no rodapé
export const CAIXA_PIN = Math.ceil(LADO * Math.SQRT2);

export function PinMapa({ avistamento }: { avistamento: Avistamento }) {
  const pin = PINS[avistamento.alergia ? 'alergia' : avistamento.grupo];
  // Miniatura de 75 px do iNaturalist: a "small" pesaria demais com dezenas de pins
  const foto = avistamento.foto?.replace('/small.', '/square.') ?? null;

  return (
    <View style={estilos.caixa}>
      <View style={[estilos.gota, { borderColor: pin.cor, backgroundColor: pin.cor }]}>
        {foto ? (
          <Image source={foto} style={estilos.foto} contentFit="cover" />
        ) : (
          <Text style={estilos.letra}>{pin.letra}</Text>
        )}
      </View>
    </View>
  );
}

export function descricaoPin(avistamento: Avistamento) {
  return avistamento.alergia ? PINS.alergia.nome : PINS[avistamento.grupo].nome;
}

const estilos = StyleSheet.create({
  caixa: {
    width: CAIXA_PIN,
    height: CAIXA_PIN,
    alignItems: 'center',
    // Sobe a gota pra ponta encostar no fim da caixa
    paddingTop: CAIXA_PIN - LADO / 2 - LADO / Math.SQRT2,
  },
  // Quadrado com 3 cantos redondos, girado = gota; a borda tem a cor do grupo
  gota: {
    width: LADO,
    height: LADO,
    borderTopLeftRadius: LADO / 2,
    borderTopRightRadius: LADO / 2,
    borderBottomLeftRadius: LADO / 2,
    borderBottomRightRadius: 4,
    transform: [{ rotate: '45deg' }],
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(20, 38, 28, 0.3)',
  },
  // Desgira a foto e aumenta um pouco pra não sobrar canto vazio dentro da gota
  foto: {
    width: LADO * 1.2,
    height: LADO * 1.2,
    transform: [{ rotate: '-45deg' }],
  },
  letra: {
    transform: [{ rotate: '-45deg' }],
    fontFamily: fontes.monoNegrito,
    fontSize: 13,
    color: cores.superficie,
  },
});
