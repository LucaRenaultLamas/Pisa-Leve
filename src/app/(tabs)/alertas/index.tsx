import { EmConstrucao, LinkDeTeste } from '@/components/EmConstrucao';

export default function MeusLocais() {
  return (
    <EmConstrucao numero={7} titulo="Meus alertas · locais" rota="/alertas">
      <LinkDeTeste href="/alertas/salvos">Ver Animais salvos</LinkDeTeste>
    </EmConstrucao>
  );
}
