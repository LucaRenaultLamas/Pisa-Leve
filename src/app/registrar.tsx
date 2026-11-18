import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { ForcaSenha } from '@/components/ForcaSenha';
import { LayoutAcesso } from '@/components/LayoutAcesso';
import { cores, espacos, fontes } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import { ErroDeCampo, usuarioDisponivel } from '@/services/contas';
import {
  conferirSenha,
  normalizarUsuario,
  validarEmail,
  validarNome,
  validarUsuario,
} from '@/utils/validacao';

type Campo = 'nome' | 'usuario' | 'email' | 'senha' | 'confirmacao';
type Erros = Partial<Record<Campo, string>>;
type Disponibilidade = 'ociosa' | 'verificando' | 'disponivel' | 'em-uso';

// Volta pro login (ou abre ele, se não tiver tela anterior)
function voltarParaEntrar() {
  if (router.canGoBack()) router.back();
  else router.replace('/login');
}

export default function Registrar() {
  const { registrar } = useSessao();
  const [nome, setNome] = useState('');
  const [usuario, setUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  // Lembra se o usuário digitado está livre
  const [verificacao, setVerificacao] = useState<{ usuario: string; livre: boolean } | null>(
    null,
  );

  const campoUsuario = useRef<TextInputInstance>(null);
  const campoEmail = useRef<TextInputInstance>(null);
  const campoSenha = useRef<TextInputInstance>(null);
  const campoConfirmacao = useRef<TextInputInstance>(null);

  // Checa o usuário quando a pessoa para de digitar
  useEffect(() => {
    if (validarUsuario(usuario)) return;
    let ativo = true;
    const espera = setTimeout(() => {
      usuarioDisponivel(usuario)
        .then((livre) => {
          if (ativo) setVerificacao({ usuario, livre });
        })
        .catch(() => {
          if (ativo) setVerificacao({ usuario, livre: true });
        });
    }, 400);
    return () => {
      ativo = false;
      clearTimeout(espera);
    };
  }, [usuario]);

  const disponibilidade: Disponibilidade = validarUsuario(usuario)
    ? 'ociosa'
    : verificacao?.usuario !== usuario
      ? 'verificando'
      : verificacao.livre
        ? 'disponivel'
        : 'em-uso';

  function mudar(campo: Campo, setter: (valor: string) => void) {
    return (texto: string) => {
      setter(texto);
      setErros((e) => ({ ...e, [campo]: undefined }));
      setErroGeral(null);
    };
  }

  async function aoCriarConta() {
    const regras = conferirSenha(senha);
    const novosErros: Erros = {
      nome: validarNome(nome) ?? undefined,
      usuario:
        validarUsuario(usuario) ??
        (disponibilidade === 'em-uso' ? 'Esse usuário já está em uso.' : undefined),
      email: validarEmail(email.trim().toLowerCase()) ?? undefined,
      senha:
        regras.tamanho && regras.letrasENumeros
          ? undefined
          : 'A senha precisa de 8 caracteres, com letras e números.',
      confirmacao: !confirmacao
        ? 'Repita a senha.'
        : confirmacao !== senha
          ? 'As senhas não coincidem'
          : undefined,
    };
    setErros(novosErros);
    setErroGeral(null);
    if (Object.values(novosErros).some(Boolean)) return;

    setSalvando(true);
    try {
      await registrar({ nome, usuario, email, senha });
      // Deu certo: já entra no app
    } catch (erro) {
      if (erro instanceof ErroDeCampo) {
        setErros({ [erro.campo]: erro.message });
      } else {
        setErroGeral('Houve um problema ao salvar no aparelho. Tente de novo.');
      }
      setSalvando(false);
    }
  }

  const erroUsuario =
    erros.usuario ?? (disponibilidade === 'em-uso' ? 'Esse usuário já está em uso.' : undefined);
  const ajudaUsuario =
    disponibilidade === 'verificando'
      ? 'Verificando…'
      : disponibilidade === 'disponivel'
        ? 'Disponível · use letras, números, ponto ou _'
        : 'Use letras, números, ponto ou _';

  // Avisa se a confirmação não bate com a senha
  const erroConfirmacao =
    erros.confirmacao ??
    (confirmacao.length >= senha.length && confirmacao && confirmacao !== senha
      ? 'As senhas não coincidem'
      : undefined);

  return (
    <LayoutAcesso
      rotulo="PISA LEVE · NOVA CONTA"
      titulo="Criar sua conta"
      subtitulo="Leva menos de um minuto."
      onVoltar={voltarParaEntrar}>
      {erroGeral && <AvisoErro titulo="Não foi possível criar a conta" mensagem={erroGeral} />}

      <CampoTexto
        rotulo="Nome"
        placeholder="Como você quer ser chamado"
        value={nome}
        onChangeText={mudar('nome', setNome)}
        erro={erros.nome}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoUsuario.current?.focus()}
      />

      <CampoTexto
        ref={campoUsuario}
        rotulo="Nome de usuário"
        prefixo="@"
        placeholder="seu.usuario"
        value={usuario}
        onChangeText={mudar('usuario', (texto) => setUsuario(normalizarUsuario(texto)))}
        erro={erroUsuario}
        ajuda={ajudaUsuario}
        valido={disponibilidade === 'disponivel'}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        maxLength={20}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoEmail.current?.focus()}
      />

      <CampoTexto
        ref={campoEmail}
        rotulo="E-mail"
        placeholder="nome@email.com"
        value={email}
        onChangeText={mudar('email', setEmail)}
        erro={erros.email}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoSenha.current?.focus()}
      />

      <CampoTexto
        ref={campoSenha}
        rotulo="Senha"
        senha
        placeholder="Crie uma senha"
        value={senha}
        onChangeText={mudar('senha', setSenha)}
        erro={erros.senha}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoConfirmacao.current?.focus()}
      />
      <ForcaSenha senha={senha} />

      <CampoTexto
        ref={campoConfirmacao}
        rotulo="Confirmar senha"
        senha
        placeholder="Repita a senha"
        value={confirmacao}
        onChangeText={mudar('confirmacao', setConfirmacao)}
        erro={erroConfirmacao}
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onSubmitEditing={aoCriarConta}
      />

      <Botao
        titulo="Criar conta"
        onPress={aoCriarConta}
        carregando={salvando}
        tituloCarregando="Criando conta…"
      />

      <View style={estilos.rodape}>
        <View style={estilos.divisor}>
          <View style={estilos.linha} />
          <Text style={estilos.divisorTexto}>JÁ TEM UMA CONTA?</Text>
          <View style={estilos.linha} />
        </View>

        {/* Volta pro /login */}
        <Botao titulo="Entrar" variante="secundario" onPress={voltarParaEntrar} />
      </View>
    </LayoutAcesso>
  );
}

const estilos = StyleSheet.create({
  rodape: {
    gap: 14,
    paddingTop: 4,
  },
  divisor: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.md,
  },
  linha: {
    flex: 1,
    height: 1,
    backgroundColor: cores.borda,
  },
  divisorTexto: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.2,
    color: cores.textoSecundario,
  },
});
