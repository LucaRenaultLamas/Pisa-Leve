import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';

import {
  autenticar,
  criarConta,
  lerSessao,
  salvarSessao,
  type DadosCadastro,
  type Usuario,
} from '@/services/contas';
import {
  lerPerfilAlergias,
  salvarPerfilAlergias,
  type PerfilAlergias,
} from '@/services/perfilAlergias';

type ValorSessao = {
  usuario: Usuario | null;
  perfil: PerfilAlergias | null; // null = ainda não passou pelo onboarding
  carregando: boolean;
  entrar: (identificador: string, senha: string, manterConectado: boolean) => Promise<void>;
  registrar: (dados: DadosCadastro) => Promise<void>;
  salvarPerfil: (dados: Omit<PerfilAlergias, 'atualizadoEm'>) => Promise<void>;
  sair: () => Promise<void>;
};

const SessaoContext = createContext<ValorSessao | null>(null);

export function SessaoProvider({ children }: PropsWithChildren) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [perfil, setPerfil] = useState<PerfilAlergias | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Usuário e perfil mudam juntos, senão o app pisca no onboarding
  async function abrirSessao(conta: Usuario) {
    const perfilSalvo = await lerPerfilAlergias(conta.usuario);
    setPerfil(perfilSalvo);
    setUsuario(conta);
  }

  // Ao abrir, vê se alguém marcou "Manter conectado"
  useEffect(() => {
    lerSessao()
      .then((conta) => (conta ? abrirSessao(conta) : undefined))
      .catch(() => {
        // Algo deu errado: começa deslogado
      })
      .finally(() => setCarregando(false));
  }, []);

  async function entrar(identificador: string, senha: string, manterConectado: boolean) {
    const conta = await autenticar(identificador, senha);
    await salvarSessao(manterConectado ? conta.usuario : null);
    await abrirSessao(conta);
  }

  async function registrar(dados: DadosCadastro) {
    const conta = await criarConta(dados);
    await salvarSessao(conta.usuario);
    await abrirSessao(conta);
  }

  async function salvarPerfil(dados: Omit<PerfilAlergias, 'atualizadoEm'>) {
    if (!usuario) throw new Error('Ninguém conectado');
    setPerfil(await salvarPerfilAlergias(usuario.usuario, dados));
  }

  async function sair() {
    await salvarSessao(null);
    setUsuario(null);
    setPerfil(null);
  }

  return (
    <SessaoContext.Provider
      value={{ usuario, perfil, carregando, entrar, registrar, salvarPerfil, sair }}>
      {children}
    </SessaoContext.Provider>
  );
}

export function useSessao() {
  const valor = useContext(SessaoContext);
  if (!valor) throw new Error('useSessao precisa estar dentro de <SessaoProvider>');
  return valor;
}
