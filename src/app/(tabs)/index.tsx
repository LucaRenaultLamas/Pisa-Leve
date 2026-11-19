import { EmConstrucao, LinkDeTeste } from '@/components/EmConstrucao';

export default function Explorar() {
  return (
    <EmConstrucao numero={3} titulo="Explorar sua região" rota="/">
      {/* Links provisórios pra testar a navegação */}
      <LinkDeTeste href="/trilha/1">Abrir Detalhe da trilha (tela 5)</LinkDeTeste>
      <LinkDeTeste href="/animal/1">Abrir Detalhe do animal (tela 7)</LinkDeTeste>
      <LinkDeTeste href="/local/novo">Abrir modal Adicionar local (tela 8)</LinkDeTeste>
    </EmConstrucao>
  );
}
