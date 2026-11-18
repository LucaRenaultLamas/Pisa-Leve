import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View, type TextInputInstance } from 'react-native';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { CaixaSelecao } from '@/components/CaixaSelecao';
import { CampoTexto } from '@/components/CampoTexto';
import { Icone } from '@/components/Icone';
import { LayoutAcesso } from '@/components/LayoutAcesso';
import { cores, espacos, fontes } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import { ErroCredenciais } from '@/services/contas';

type Erros = {
  identificador?: string;
  senha?: string;
};

type ErroGeral = {
  titulo: string;
  mensagem: string;
  credenciais: boolean;
};

export default function Login() {
  const { entrar } = useSessao();
  const [identificador, setIdentificador] = useState('');
  const [senha, setSenha] = useState('');
  const [manterConectado, setManterConectado] = useState(true);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState<ErroGeral | null>(null);
  const [entrando, setEntrando] = useState(false);
  const campoSenha = useRef<TextInputInstance>(null);

  async function aoEntrar() {
    const novosErros: Erros = {};
    if (!identificador.trim()) novosErros.identificador = 'Digite seu e-mail ou usuário.';
    if (!senha) novosErros.senha = 'Digite sua senha.';
    setErros(novosErros);
    setErroGeral(null);
    if (novosErros.identificador || novosErros.senha) return;

    setEntrando(true);
    try {
      await entrar(identificador, senha, manterConectado);
      // Deu certo: o _layout já leva pro app
    } catch (erro) {
      setErroGeral(
        erro instanceof ErroCredenciais
          ? {
              titulo: 'Usuário ou senha incorretos',
              mensagem: 'Confira os dados e tente de novo.',
              credenciais: true,
            }
          : {
              titulo: 'Não foi possível entrar',
              mensagem: 'Houve um problema ao ler os dados do aparelho. Tente de novo.',
              credenciais: false,
            },
      );
      setEntrando(false);
    }
  }

  function limparErros() {
    if (erroGeral) setErroGeral(null);
  }

  const destacar = erroGeral?.credenciais ?? false;

  return (
    <LayoutAcesso
      rotulo="PISA LEVE"
      titulo="Bem-vindo de volta à trilha"
      subtitulo="Entre para ver seus alertas e trilhas salvas.">
      {erroGeral && <AvisoErro titulo={erroGeral.titulo} mensagem={erroGeral.mensagem} />}

      <CampoTexto
        rotulo="E-mail ou usuário"
        icone="usuario"
        placeholder="nome@email.com ou usuário"
        value={identificador}
        onChangeText={(texto) => {
          setIdentificador(texto);
          setErros((e) => ({ ...e, identificador: undefined }));
          limparErros();
        }}
        erro={erros.identificador ?? destacar}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => campoSenha.current?.focus()}
      />

      <CampoTexto
        ref={campoSenha}
        rotulo="Senha"
        icone="cadeado"
        senha
        placeholder="Sua senha"
        value={senha}
        onChangeText={(texto) => {
          setSenha(texto);
          setErros((e) => ({ ...e, senha: undefined }));
          limparErros();
        }}
        erro={erros.senha ?? destacar}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={aoEntrar}
      />

      <CaixaSelecao
        rotulo="Manter conectado neste celular"
        marcado={manterConectado}
        onMudar={setManterConectado}
      />

      <Botao
        titulo="Entrar"
        icone="seta"
        onPress={aoEntrar}
        carregando={entrando}
        tituloCarregando="Entrando…"
      />

      <View style={estilos.espaco} />

      <View style={estilos.rodape}>
        <View style={estilos.divisor}>
          <View style={estilos.linha} />
          <Text style={estilos.divisorTexto}>PRIMEIRA VEZ AQUI?</Text>
          <View style={estilos.linha} />
        </View>

        <Botao
          titulo="Criar conta"
          variante="secundario"
          onPress={() => router.push('/registrar')}
        />

        <View style={estilos.aviso}>
          <Icone nome="cadeado" cor={cores.textoSecundario} tamanho={14} />
          <Text style={estilos.avisoTexto}>Sua conta fica salva apenas neste celular.</Text>
        </View>
      </View>
    </LayoutAcesso>
  );
}

const estilos = StyleSheet.create({
  espaco: {
    flexGrow: 1,
    minHeight: espacos.sm,
  },
  rodape: {
    gap: 14,
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
  aviso: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  avisoTexto: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
});
