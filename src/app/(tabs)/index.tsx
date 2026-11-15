import { EmConstrucao, LinkDeTeste } from '@/components/EmConstrucao';

export default function Explorar() {
  return (
    <EmConstrucao numero={2} titulo="Explorar sua região" rota="/">
      {/* Links provisórios só para testar a navegação. Saem na etapa 2. */}
      <LinkDeTeste href="/onboarding">Abrir Perfil de alergias (tela 1)</LinkDeTeste>
      <LinkDeTeste href="/trilha/1">Abrir Detalhe da trilha (tela 4)</LinkDeTeste>
      <LinkDeTeste href="/animal/1">Abrir Detalhe do animal (tela 6)</LinkDeTeste>
      <LinkDeTeste href="/local/novo">Abrir modal Adicionar local (tela 7)</LinkDeTeste>
    </EmConstrucao>
  );
}
