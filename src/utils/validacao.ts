
const FORMATO_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FORMATO_USUARIO = /^[a-z0-9._]+$/;

export function validarNome(nome: string): string | null {
  if (nome.trim().length < 2) return 'Digite seu nome (pelo menos 2 letras).';
  return null;
}

export function validarUsuario(usuario: string): string | null {
  if (!usuario) return 'Escolha um nome de usuário.';
  if (usuario.length < 3) return 'Use pelo menos 3 caracteres.';
  if (usuario.length > 20) return 'Use no máximo 20 caracteres.';
  if (!FORMATO_USUARIO.test(usuario)) return 'Use só letras minúsculas, números, ponto ou _.';
  return null;
}

export function validarEmail(email: string): string | null {
  if (!email) return 'Digite seu e-mail.';
  if (!FORMATO_EMAIL.test(email)) return 'E-mail inválido. Ex.: nome@email.com';
  return null;
}

export type RegrasSenha = {
  tamanho: boolean;
  letrasENumeros: boolean;
  forte: boolean; // 12+ caracteres ou um símbolo
};

export function conferirSenha(senha: string): RegrasSenha {
  return {
    tamanho: senha.length >= 8,
    letrasENumeros: /[a-zA-Z]/.test(senha) && /\d/.test(senha),
    forte: senha.length >= 12 || /[^a-zA-Z0-9]/.test(senha),
  };
}

// Força de 0 a 3 (quantos pedaços da barra acendem)
export function forcaDaSenha(senha: string): number {
  if (!senha) return 0;
  const regras = conferirSenha(senha);
  return [regras.tamanho, regras.letrasENumeros, regras.forte].filter(Boolean).length;
}

// Deixa o usuário minúsculo, sem espaço e sem @
export function normalizarUsuario(texto: string): string {
  return texto.replace(/^@/, '').replace(/\s/g, '').toLowerCase();
}
