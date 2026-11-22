import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';

type Props<T> = {
  itens: T[];
  chave: (item: T) => string | number;
  renderItem: (item: T) => ReactNode;
  pxPorSegundo?: number;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

const PAUSA_DEPOIS_DO_TOQUE_MS = 3000;

// Faixa horizontal que anda sozinha devagar e dá a volta; parar o dedo ou o mouse em cima pausa
export function CarrosselLento<T>({
  itens,
  chave,
  renderItem,
  pxPorSegundo = 15,
  style,
  contentContainerStyle,
}: Props<T>) {
  const rolagem = useRef<ComponentRef<typeof ScrollView>>(null);
  const x = useRef(0);
  const pausadoAte = useRef(0);
  const segurando = useRef(false);
  const [larguraVisivel, setLarguraVisivel] = useState(0);
  const [larguraConteudo, setLarguraConteudo] = useState(0);
  // Onde começam o 1º cartão e a 1ª cópia: a diferença é uma volta exata (com os espaços)
  const [inicioOriginal, setInicioOriginal] = useState<number | null>(null);
  const [inicioCopia, setInicioCopia] = useState<number | null>(null);
  const [semMovimento, setSemMovimento] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSemMovimento)
      .catch(() => {});
    const assinatura = AccessibilityInfo.addEventListener('reduceMotionChanged', setSemMovimento);
    return () => assinatura.remove();
  }, []);

  const cabe = larguraConteudo <= larguraVisivel;
  const repete = !semMovimento && larguraVisivel > 0 && !cabe;
  const volta = inicioOriginal !== null && inicioCopia !== null ? inicioCopia - inicioOriginal : 0;
  const anda = repete && volta > 0;

  useEffect(() => {
    if (!anda) return;
    let quadro = 0;
    let antes = 0;
    const passo = (agora: number) => {
      const dt = antes ? (agora - antes) / 1000 : 0;
      antes = agora;
      if (!segurando.current && Date.now() > pausadoAte.current) {
        let novo = x.current + pxPorSegundo * dt;
        // Chegou na cópia: pula de volta pro começo igual, sem dar pra notar
        if (novo >= volta) novo -= volta;
        x.current = novo;
        rolagem.current?.scrollTo({ x: novo, animated: false });
      }
      quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [anda, volta, pxPorSegundo]);

  function pausar() {
    pausadoAte.current = Date.now() + PAUSA_DEPOIS_DO_TOQUE_MS;
  }

  // Na web, passar o mouse por cima também segura
  const mouse = {
    onPointerEnter: () => {
      segurando.current = true;
    },
    onPointerLeave: () => {
      segurando.current = false;
      pausar();
    },
  } as object;

  const lista = repete ? [...itens, ...itens] : itens;

  return (
    <ScrollView
      ref={rolagem}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={style}
      contentContainerStyle={contentContainerStyle}
      onLayout={(e) => setLarguraVisivel(e.nativeEvent.layout.width)}
      onContentSizeChange={(largura) => {
        // Mede só a lista sem repetição pra decidir se precisa andar
        if (!repete) setLarguraConteudo(largura);
      }}
      scrollEventThrottle={32}
      onScroll={(e) => {
        // A pessoa arrastou: continua de onde ela parou
        if (segurando.current || Date.now() < pausadoAte.current) {
          x.current = e.nativeEvent.contentOffset.x % (volta || 1);
        }
      }}
      onTouchStart={() => {
        segurando.current = true;
      }}
      onTouchEnd={() => {
        segurando.current = false;
        pausar();
      }}
      onScrollBeginDrag={() => {
        segurando.current = true;
      }}
      onScrollEndDrag={() => {
        segurando.current = false;
        pausar();
      }}
      onMomentumScrollEnd={pausar}
      {...mouse}>
      {lista.map((item, i) => {
        const copia = i >= itens.length;
        return (
          <View
            key={`${chave(item)}${copia ? '-copia' : ''}`}
            onLayout={
              i === 0
                ? (e) => setInicioOriginal(e.nativeEvent.layout.x)
                : i === itens.length
                  ? (e) => setInicioCopia(e.nativeEvent.layout.x)
                  : undefined
            }
            // A repetição é só visual: o leitor de tela lê cada cartão uma vez
            accessibilityElementsHidden={copia}
            importantForAccessibility={copia ? 'no-hide-descendants' : 'auto'}>
            {renderItem(item)}
          </View>
        );
      })}
    </ScrollView>
  );
}
