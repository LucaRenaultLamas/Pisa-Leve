import { EmConstrucao, LinkDeTeste } from '@/components/EmConstrucao';

export default function Onboarding() {
  return (
    <EmConstrucao numero={1} titulo="Perfil de alergias" rota="/onboarding">
      <LinkDeTeste href="/">Salvar e continuar (provisório)</LinkDeTeste>
    </EmConstrucao>
  );
}
