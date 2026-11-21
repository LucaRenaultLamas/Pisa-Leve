import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SimboloPisaLeve } from '@/components/SimboloPisaLeve';

type Props = {
  tamanho?: 'pequeno' | 'grande';
  variante?: 'cor' | 'clara';
  corFundo?: string;
  rotulo?: string;
  style?: StyleProp<ViewStyle>;
};

const ALTURA = { pequeno: 22, grande: 44 };

// Spinner do app: o símbolo balançando de leve
export function Carregando({
  tamanho = 'grande',
  variante = 'cor',
  corFundo,
  rotulo = 'Carregando',
  style,
}: Props) {
  const [balanco] = useState(() => new Animated.Value(0));
  const [parado, setParado] = useState(false);

  // Quem ativou "reduzir movimento" vê o símbolo parado
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setParado)
      .catch(() => {});
    const inscricao = AccessibilityInfo.addEventListener('reduceMotionChanged', setParado);
    return () => inscricao.remove();
  }, []);

  useEffect(() => {
    if (parado) return;
    const ida = {
      duration: 900,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: Platform.OS !== 'web',
    };
    const animacao = Animated.loop(
      Animated.sequence([
        Animated.timing(balanco, { ...ida, toValue: 1 }),
        Animated.timing(balanco, { ...ida, toValue: 0 }),
      ]),
    );
    animacao.start();
    return () => animacao.stop();
  }, [parado, balanco]);

  const rotate = balanco.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
  const scale = balanco.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.05] });

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={rotulo}
      style={[{ transform: [{ rotate }, { scale }] }, style]}>
      <SimboloPisaLeve altura={ALTURA[tamanho]} variante={variante} corFundo={corFundo} />
    </Animated.View>
  );
}
