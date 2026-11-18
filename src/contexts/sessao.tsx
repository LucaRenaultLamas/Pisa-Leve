import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import {
  autenticar,
  criarConta,
  lerSessao,
  salvarSessao,
  type DadosCadastro,
  type Usuario,
} from '@/services/contas';

type ValorSessao = {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (identificador: string, senha: string, manterConectado: boolean) => Promise<void>;
  registrar: (dados: DadosCadastro) => Promise<void>;
  sair: () => Promise<void>;
};

const SessaoContext = createContext<ValorSessao | null>(null);

export function SessaoProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Ao abrir, vê se alguém marcou "Manter conectado"
  useEffect(() => {
    lerSessao()
      .then(setUsuario)
      .catch(() => {
        // Algo deu errado: começa deslogado
      })
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(identificador: string, senha: string, manterConectado: boolean) {
    const conta = await autenticar(identificador, senha);
    await salvarSessao(manterConectado ? conta.usuario : null);
    setUsuario(conta);
  }

  async function registrar(dados: DadosCadastro) {
    const conta = await criarConta(dados);
    await salvarSessao(conta.usuario);
    setUsuario(conta);
  }

  async function sair() {
    await salvarSessao(null);
    setUsuario(null);
  }

  return (
    <SessaoContext.Provider value={{ usuario, carregando, entrar, registrar, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  const valor = useContext(SessaoContext);
  if (!valor) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return valor;
}
