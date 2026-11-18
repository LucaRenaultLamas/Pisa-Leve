import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { normalizarUsuario } from '@/utils/validacao';

export type Usuario = {
  nome: string;
  usuario: string;
  email: string;
};

type ContaSalva = Usuario & {
  sal: string;
  senhaHash: string;
};

export type DadosCadastro = Usuario & { senha: string };

const CHAVE_CONTAS = '@pisa-leve/contas';
const CHAVE_SESSAO = '@pisa-leve/sessao';

export class ErroDeCampo extends Error {
  constructor(
    public campo: 'usuario' | 'email',
    mensagem: string,
  ) {
    super(mensagem);
  }
}

export class ErroCredenciais extends Error {
  constructor() {
    super('Usuário ou senha incorretos');
  }
}

async function lerContas(): Promise<ContaSalva[]> {
  const texto = await AsyncStorage.getItem(CHAVE_CONTAS);
  return texto ? (JSON.parse(texto) as ContaSalva[]) : [];
}

// A senha nunca é salva: só o hash dela com um sal aleatório
function gerarHash(senha: string, sal: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${sal}:${senha}`);
}

function semSenha({ nome, usuario, email }: ContaSalva): Usuario {
  return { nome, usuario, email };
}

export async function usuarioDisponivel(usuario: string): Promise<boolean> {
  const contas = await lerContas();
  return !contas.some((c) => c.usuario === usuario);
}

export async function criarConta(dados: DadosCadastro): Promise<Usuario> {
  const contas = await lerContas();
  const usuario = normalizarUsuario(dados.usuario);
  const email = dados.email.trim().toLowerCase();

  if (contas.some((c) => c.usuario === usuario)) {
    throw new ErroDeCampo('usuario', 'Esse usuário já está em uso.');
  }
  if (contas.some((c) => c.email === email)) {
    throw new ErroDeCampo('email', 'Já existe uma conta com esse e-mail.');
  }

  const sal = Crypto.randomUUID();
  const conta: ContaSalva = {
    nome: dados.nome.trim(),
    usuario,
    email,
    sal,
    senhaHash: await gerarHash(dados.senha, sal),
  };

  await AsyncStorage.setItem(CHAVE_CONTAS, JSON.stringify([...contas, conta]));
  return semSenha(conta);
}

// Confere o login (e-mail ou usuário) e a senha
export async function autenticar(identificador: string, senha: string): Promise<Usuario> {
  const contas = await lerContas();
  const id = identificador.trim().toLowerCase();
  const porEmail = id.includes('@') && !id.startsWith('@');

  const conta = contas.find((c) =>
    porEmail ? c.email === id : c.usuario === normalizarUsuario(id),
  );
  if (!conta || (await gerarHash(senha, conta.sal)) !== conta.senhaHash) {
    throw new ErroCredenciais();
  }
  return semSenha(conta);
}

export async function salvarSessao(usuario: string | null) {
  if (usuario) await AsyncStorage.setItem(CHAVE_SESSAO, usuario);
  else await AsyncStorage.removeItem(CHAVE_SESSAO);
}

export async function lerSessao(): Promise<Usuario | null> {
  const usuario = await AsyncStorage.getItem(CHAVE_SESSAO);
  if (!usuario) return null;
  const conta = (await lerContas()).find((c) => c.usuario === usuario);
  return conta ? semSenha(conta) : null;
}
