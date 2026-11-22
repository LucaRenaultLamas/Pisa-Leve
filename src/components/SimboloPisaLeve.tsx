import SimboloClara from '@/assets/svg/simbolo-clara.svg';
import SimboloCor from '@/assets/svg/simbolo-cor.svg';
import { cores } from '@/constants/tema';

type Variante = 'cor' | 'clara';

type Props = {
  altura?: number;
  variante?: Variante;
  corFundo?: string;
};

const VARIANTES = {
  cor: { Desenho: SimboloCor, fundo: cores.fundo },
  clara: { Desenho: SimboloClara, fundo: cores.primaria },
} as const;

// As nervuras usam currentColor no .svg, então a cor vem de `color`
export function SimboloPisaLeve({ altura = 40, variante = 'cor', corFundo }: Props) {
  const { Desenho, fundo } = VARIANTES[variante];

  return (
    <Desenho
      width={(altura * 62) / 102}
      height={altura}
      color={corFundo ?? fundo}
      accessibilityRole="image"
      accessibilityLabel="Pisa Leve"
    />
  );
}
