import { Botao } from '@/components/Botao';
import { EmConstrucao } from '@/components/EmConstrucao';
import { useSessao } from '@/contexts/sessao';

export default function Perfil() {
  const { usuario, sair } = useSessao();

  return (
    <EmConstrucao numero={8} titulo={`Meu perfil · ${usuario?.nome ?? ''}`} rota="/perfil">
      <Botao titulo="Sair (provisório)" variante="secundario" onPress={sair} />
    </EmConstrucao>
  );
}
