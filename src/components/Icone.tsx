import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type NomeIcone =
  | 'usuario'
  | 'cadeado'
  | 'olho'
  | 'olhoFechado'
  | 'seta'
  | 'voltar'
  | 'check'
  | 'alerta'
  | 'montanha'
  | 'mais'
  | 'fechar'
  | 'info';

type Props = {
  nome: NomeIcone;
  tamanho?: number;
  cor: string;
  espessura?: number;
};

// Ícones desenhados à mão em SVG
export function Icone({ nome, tamanho = 20, cor, espessura = 1.8 }: Props) {
  const traco = {
    stroke: cor,
    strokeWidth: espessura,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" aria-hidden>
      {nome === 'usuario' && (
        <>
          <Circle cx={12} cy={8} r={4} {...traco} />
          <Path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" {...traco} />
        </>
      )}
      {nome === 'cadeado' && (
        <>
          <Rect x={5} y={10.5} width={14} height={9.5} rx={2.5} {...traco} />
          <Path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" {...traco} />
        </>
      )}
      {(nome === 'olho' || nome === 'olhoFechado') && (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...traco} />
          <Circle cx={12} cy={12} r={3} {...traco} />
          {nome === 'olhoFechado' && <Path d="M4 4l16 16" {...traco} />}
        </>
      )}
      {nome === 'seta' && <Path d="M5 12h14M13 6l6 6-6 6" {...traco} />}
      {nome === 'voltar' && <Path d="M19 12H5M11 6l-6 6 6 6" {...traco} />}
      {nome === 'check' && <Path d="m5 12 4.5 4.5L19 7" {...traco} />}
      {nome === 'alerta' && (
        <>
          <Circle cx={12} cy={12} r={9} {...traco} />
          <Path d="M12 7.5v5.5M12 16.5v.1" {...traco} />
        </>
      )}
      {nome === 'montanha' && (
        <>
          <Path d="m3 20 6.5-11 4 6.5L16 12l5 8z" {...traco} />
          <Path d="M8 5.5a1.5 1.5 0 1 0 0-.01" {...traco} />
        </>
      )}
      {nome === 'mais' && <Path d="M12 5v14M5 12h14" {...traco} />}
      {nome === 'fechar' && <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...traco} />}
      {nome === 'info' && (
        <>
          <Circle cx={12} cy={12} r={8.5} {...traco} />
          <Path d="M12 11v5M12 8v.1" {...traco} />
        </>
      )}
    </Svg>
  );
}
