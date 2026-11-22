// Faz o TypeScript aceitar import de .svg
declare module '*.svg' {
  import type { FC } from 'react';
  import type { SvgProps } from 'react-native-svg';

  const Componente: FC<SvgProps>;
  export default Componente;
}
