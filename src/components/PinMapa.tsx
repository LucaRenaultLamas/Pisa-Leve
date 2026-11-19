import { StyleSheet, Text, View } from 'react-native';

import { PINS } from '@/constants/animais';
import { cores, fontes } from '@/constants/tema';
import type { Avistamento } from '@/services/inaturalist';

export function PinMapa({ avistamento }: { avistamento: Avistamento }) {
  const pin = PINS[avistamento.alergia ? 'alergia' : avistamento.grupo];

  return (
    <View style={[estilos.gota, { backgroundColor: pin.cor }]}>
      <Text style={estilos.letra}>{pin.letra}</Text>
    </View>
  );
}

export function descricaoPin(avistamento: Avistamento) {
  return avistamento.alergia ? PINS.alergia.nome : PINS[avistamento.grupo].nome;
}

const estilos = StyleSheet.create({
  // Quadrado com 3 cantos redondos, girado = gota
  gota: {
    width: 30,
    height: 30,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 3,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderColor: cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(20, 38, 28, 0.3)',
  },
  letra: {
    transform: [{ rotate: '-45deg' }],
    fontFamily: fontes.monoNegrito,
    fontSize: 12,
    color: cores.superficie,
  },
});
