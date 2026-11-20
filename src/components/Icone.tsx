import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';

// Nome no app -> nome no Ionicons. Lista em https://icons.expo.fyi
const ICONES = {
  usuario: 'person-outline',
  cadeado: 'lock-closed-outline',
  olho: 'eye-outline',
  olhoFechado: 'eye-off-outline',
  seta: 'arrow-forward',
  voltar: 'arrow-back',
  check: 'checkmark',
  alerta: 'alert-circle-outline',
  montanha: 'trail-sign-outline',
  mais: 'add',
  menos: 'remove',
  fechar: 'close',
  info: 'information-circle-outline',
  pin: 'location-outline',
  coracao: 'heart-outline',
  coracaoCheio: 'heart',
  sino: 'notifications-outline',
  sair: 'log-out-outline',
  editar: 'pencil-outline',
  avancar: 'chevron-forward',
  email: 'mail-outline',
  arroba: 'at-outline',
  expandir: 'chevron-down',
  recolher: 'chevron-up',
  mira: 'locate-outline',
  foto: 'image-outline',
  recarregar: 'refresh',
  folha: 'leaf-outline',
  filtro: 'options-outline',
  relogio: 'time-outline',
  escudo: 'shield-checkmark-outline',
  busca: 'search-outline',
  ordenar: 'swap-vertical-outline',
  // Barra de abas na web: contorno quando fora, cheio quando é a aba aberta
  mapa: 'map-outline',
  mapaCheio: 'map',
  caminhada: 'walk-outline',
  caminhadaCheia: 'walk',
  buscaCheia: 'search',
  sinoCheio: 'notifications',
  usuarioCheio: 'person',
  calendario: 'calendar-outline',
  telefone: 'call-outline',
  perigo: 'warning-outline',
} satisfies Record<string, ComponentProps<typeof Ionicons>['name']>;

export type NomeIcone = keyof typeof ICONES;

type Props = {
  nome: NomeIcone;
  tamanho?: number;
  cor: string;
};

export function Icone({ nome, tamanho = 20, cor }: Props) {
  return <Ionicons name={ICONES[nome]} size={tamanho} color={cor} aria-hidden />;
}
