import { router, useFocusEffect } from 'expo-router';
import { setStatusBarStyle } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import CurvasDeNivel from '@/assets/svg/curvas-de-nivel.svg';
import { Icone, type NomeIcone } from '@/components/Icone';
import { LinhaMenu } from '@/components/LinhaMenu';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { gruposDeAlergias } from '@/constants/alergias';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useAlertas } from '@/contexts/alertas';
import { useFavoritas } from '@/contexts/favoritas';
import { useSessao } from '@/contexts/sessao';
import { lerAnimaisSalvos } from '@/services/animaisSalvos';
import { iniciais } from '@/utils/texto';

// Troca os ids salvos pelos nomes da lista
const rotuloPorId = new Map(
  gruposDeAlergias.flatMap((g) => g.itens).map((item) => [item.id, item.rotulo]),
);

export default function Perfil() {
  const { usuario, perfil, sair } = useSessao();
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [avisoEmBreve, setAvisoEmBreve] = useState(false);

  // Topo verde: ícones da barra de status em branco só enquanto a aba está aberta
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle('light');
      return () => setStatusBarStyle('dark');
    }, []),
  );

  const alergias = [
    ...(perfil?.selecionadas ?? []).map((id) => rotuloPorId.get(id) ?? id),
    ...(perfil?.outras ?? []),
  ];

  const { locais } = useAlertas();
  const { favoritas } = useFavoritas();
  const [animaisSalvos, setAnimaisSalvos] = useState(0);
  const nomeUsuario = usuario?.usuario;
  // Lê ao voltar pra aba: o coração do detalhe do animal muda a lista
  useFocusEffect(
    useCallback(() => {
      if (!nomeUsuario) return;
      lerAnimaisSalvos(nomeUsuario)
        .then((a) => setAnimaisSalvos(a.length))
        .catch(() => setAnimaisSalvos(0));
    }, [nomeUsuario]),
  );

  const totalLocais = locais.length;
  const totalSalvos = animaisSalvos + favoritas.length;

  const nome = usuario?.nome ?? '';

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView
        style={estilos.tela}
        contentContainerStyle={estilos.rolagem}
        bounces={false}
        showsVerticalScrollIndicator={false}>
        {/* Topo verde, igual ao de Entrar */}
        <View style={estilos.cabecalho}>
          <CurvasDeNivel style={StyleSheet.absoluteFill} width="100%" height="100%" aria-hidden />

          <View style={estilos.topo}>
            <Text style={estilos.rotulo}>PISA LEVE · PERFIL</Text>
          </View>

          <View style={estilos.identidade}>
            <View style={estilos.avatar} accessibilityLabel={`Foto de perfil de ${nome}`}>
              <Text style={estilos.avatarTexto}>{iniciais(nome)}</Text>
            </View>
            <View style={estilos.nomes}>
              <Text style={estilos.nome} accessibilityRole="header">
                Olá, {nome}
              </Text>
            </View>
          </View>
        </View>

        {/* Folha clara que sobe por cima do verde */}
        <View style={estilos.folha}>
          <View style={estilos.resumo}>
            <Resumo valor={alergias.length} rotulo="Alergias" />
            <Resumo valor={totalLocais} rotulo="Locais" />
            <Resumo valor={totalSalvos} rotulo="Salvos" />
          </View>

          <View style={estilos.cartao}>
            <View style={estilos.cartaoTopo}>
              <Text style={estilos.cartaoTitulo}>Minhas alergias</Text>
              {/* Único caminho para o formulário depois do primeiro login */}
              <Pressable
                onPress={() => router.push('/onboarding')}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Editar minhas alergias">
                <Text style={estilos.editar}>Editar</Text>
              </Pressable>
            </View>

            {alergias.length > 0 ? (
              <View style={estilos.etiquetas}>
                {alergias.map((rotulo) => (
                  <View key={rotulo} style={estilos.etiqueta}>
                    <Icone nome="check" cor={cores.primaria} tamanho={14} />
                    <Text style={estilos.etiquetaTexto}>{rotulo}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={estilos.vazio}>
                Nenhuma alergia marcada. Toque em Editar para escolher.
              </Text>
            )}
          </View>

          {usuario && (
            <View style={estilos.cartao}>
              <Text style={estilos.cartaoTitulo}>Minha conta</Text>
              <View>
                <InfoConta primeira icone="usuario" rotulo="Nome" valor={usuario.nome} />
                <InfoConta icone="arroba" rotulo="Usuário" valor={`@${usuario.usuario}`} />
                <InfoConta icone="email" rotulo="E-mail" valor={usuario.email} />
              </View>
            </View>
          )}

          <View style={estilos.cartaoMenu}>
            <LinhaMenu
              primeira
              icone="pin"
              titulo="Locais monitorados"
              valor={String(totalLocais)}
              onPress={() => router.navigate('/alertas')}
            />
            <LinhaMenu
              icone="coracao"
              titulo="Animais e trilhas salvos"
              valor={String(totalSalvos)}
              onPress={() => router.navigate('/alertas/salvos')}
            />
            <LinhaMenu
              icone="sino"
              titulo="Preferências e notificações"
              onPress={() => setAvisoEmBreve(true)}
            />
            <LinhaMenu
              perigo
              icone="sair"
              titulo="Sair da conta"
              onPress={() => setConfirmarSaida(true)}
            />
          </View>
        </View>
      </ScrollView>

      <PopupConfirmacao
        visivel={confirmarSaida}
        icone="sair"
        perigo
        titulo="Sair da conta?"
        mensagem="Você vai precisar entrar de novo para ver seus alertas e trilhas."
        textoConfirmar="Sair"
        textoCancelar="Cancelar"
        onConfirmar={() => {
          setConfirmarSaida(false);
          sair();
        }}
        onCancelar={() => setConfirmarSaida(false)}
      />

      <PopupConfirmacao
        visivel={avisoEmBreve}
        icone="info"
        titulo="Em breve"
        mensagem="Esta opção ainda está em desenvolvimento."
        textoConfirmar="Entendi"
        onConfirmar={() => setAvisoEmBreve(false)}
        onCancelar={() => setAvisoEmBreve(false)}
      />
    </SafeAreaView>
  );
}

function InfoConta({
  icone,
  rotulo,
  valor,
  primeira = false,
}: {
  icone: NomeIcone;
  rotulo: string;
  valor: string;
  primeira?: boolean;
}) {
  return (
    <View style={[estilos.info, !primeira && estilos.infoDivisoria]}>
      <View style={estilos.infoIcone}>
        <Icone nome={icone} cor={cores.primaria} tamanho={18} />
      </View>
      <View style={estilos.infoTextos}>
        <Text style={estilos.infoRotulo}>{rotulo}</Text>
        <Text style={estilos.infoValor} selectable>
          {valor}
        </Text>
      </View>
    </View>
  );
}

function Resumo({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <View style={estilos.resumoItem}>
      <Text style={estilos.resumoValor}>{valor}</Text>
      <Text style={estilos.resumoRotulo}>{rotulo}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.primaria,
  },
  rolagem: {
    flexGrow: 1,
  },
  cabecalho: {
    paddingTop: espacos.md,
    paddingHorizontal: espacos.xl,
    paddingBottom: 56,
    gap: espacos.sm,
    overflow: 'hidden',
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rotulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.selecionado,
  },
  identidade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.lg,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: cores.superficie,
    backgroundColor: cores.selecionado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontFamily: fontes.monoNegrito,
    fontSize: 24,
    color: cores.primaria,
  },
  nomes: {
    flex: 1,
    gap: 3,
  },
  nome: {
    fontFamily: fontes.monoNegrito,
    fontSize: 22,
    lineHeight: 27,
    color: cores.superficie,
  },
  folha: {
    flexGrow: 1,
    marginTop: -36,
    paddingTop: espacos.xl,
    paddingHorizontal: espacos.xl,
    paddingBottom: espacos.xxl,
    gap: 14,
    backgroundColor: cores.fundo,
    borderTopLeftRadius: raios.folha,
    borderTopRightRadius: raios.folha,
  },
  resumo: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: espacos.sm,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  resumoItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  resumoValor: {
    fontFamily: fontes.monoNegrito,
    fontSize: 20,
    color: cores.primaria,
  },
  resumoRotulo: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  cartao: {
    padding: espacos.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    gap: espacos.md,
  },
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cartaoTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  editar: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: espacos.sm,
    paddingHorizontal: espacos.md,
    borderRadius: raios.md,
    backgroundColor: cores.selecionado,
  },
  etiquetaTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primaria,
  },
  vazio: {
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.textoSecundario,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.md,
    paddingVertical: 10,
  },
  infoDivisoria: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  infoIcone: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: cores.selecionado,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoTextos: {
    flex: 1,
    gap: 2,
  },
  infoRotulo: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  infoValor: {
    fontFamily: fontes.media,
    fontSize: 15,
    color: cores.texto,
  },
  cartaoMenu: {
    paddingVertical: espacos.xs,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
});
