export const cores = {
  fundo: '#EEF4EC',
  superficie: '#FFFFFF',
  primaria: '#173F2E',
  primariaMedia: '#2B6A4B',
  selecionado: '#DCEBD6',
  borda: '#D6E2D2',
  bordaForte: '#9DB3A3',
  texto: '#14261C',
  textoSecundario: '#4D6155',
  erro: '#B3261E',
  erroFundo: '#FBE9E7',
  erroBorda: '#E7B7B1',
  erroTexto: '#8C1D18',
  primariaClara: '#5E8F74',
  // Aviso amarelo (alergia)
  avisoFundo: '#FCEFC7',
  avisoBorda: '#EBD48A',
  avisoTexto: '#6B4E00',
  // Etiqueta "Peçonhento"
  perigoFundo: '#FBDAD6',
  perigoTexto: '#9A2219',
  // Mapa
  mapaFundo: '#E4EEDF',
  fotoVazia: '#C9D9C3',
  voceAqui: '#2F7BD8',
  // Risco por trecho (mockup de Trilhas)
  riscoBaixo: '#2E8B57',
  riscoMedio: '#E3A21A',
  riscoAlto: '#B4271C',
} as const;

export const fontes = {
  regular: 'Inter_400Regular',
  media: 'Inter_500Medium',
  semiNegrito: 'Inter_600SemiBold',
  negrito: 'Inter_700Bold',
  mono: 'SpaceMono_400Regular',
  monoNegrito: 'SpaceMono_700Bold',
} as const;

export const espacos = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const raios = {
  sm: 8,
  md: 12,
  campo: 14,
  lg: 16,
  folha: 28,
} as const;
