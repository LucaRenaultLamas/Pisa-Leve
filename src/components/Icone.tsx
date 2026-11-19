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
  fechar: 'close',
  info: 'information-circle-outline',
  pin: 'location-outline',
  coracao: 'heart-outline',
  sino: 'notifications-outline',
  sair: 'log-out-outline',
  editar: 'pencil-outline',
  avancar: 'chevron-forward',
  email: 'mail-outline',
  arroba: 'at-outline',
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
