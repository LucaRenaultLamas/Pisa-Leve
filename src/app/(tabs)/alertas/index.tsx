import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { CartaoLocal, resumoDoLocal } from '@/components/CartaoLocal';
import { Icone } from '@/components/Icone';
import { LinhaMenu } from '@/components/LinhaMenu';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { contarNovos, useAlertas } from '@/contexts/alertas';
import { useFavoritas } from '@/contexts/favoritas';
import { useSessao } from '@/contexts/sessao';
import { lerAnimaisSalvos } from '@/services/animaisSalvos';
import { MAX_LOCAIS, type Local } from '@/services/locais';

function hora(ms: number) {
  return new Date(ms).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Alertas() {
  const { usuario } = useSessao();
  const { favoritas } = useFavoritas();
  const { locais, estados, totalNovos, checadoEm, carregandoLocais, checarTodos, checarSeVelho } =
    useAlertas();
  const [animaisSalvos, setAnimaisSalvos] = useState(0);

  const nomeUsuario = usuario?.usuario;
  useFocusEffect(
    useCallback(() => {
      checarSeVelho();
      if (!nomeUsuario) return;
      lerAnimaisSalvos(nomeUsuario)
        .then((a) => setAnimaisSalvos(a.length))
        .catch(() => setAnimaisSalvos(0));
    }, [checarSeVelho, nomeUsuario]),
  );

  const conferindo = locais.some((l) => estados[l.id]?.tipo === 'carregando');
  const comErro = locais.filter((l) => estados[l.id]?.tipo === 'erro').length;
  const locaisComNovos = locais.filter((l) => contarNovos(estados[l.id]) > 0).length;
  const temPeconhento = locais.some((l) => {
    const e = estados[l.id];
    return e?.tipo === 'pronto' && e.registros.some((r) => r.novo && r.peconhento);
  });

  // Novidades primeiro (peçonhento antes de alergia), depois a ordem em que foram criados
  const peso = (l: Local) => {
    const r = resumoDoLocal(estados[l.id]);
    if (r.novos === 0) return 2;
    return r.cor === cores.perigoTexto ? 0 : 1;
  };
  const ordenados = [...locais].sort((a, b) => peso(a) - peso(b));

  function abrir(local: Local) {
    router.push({ pathname: '/alertas/local/[id]', params: { id: local.id } });
  }

  const novoLocal = () => router.push('/local/novo');
  const cheio = locais.length >= MAX_LOCAIS;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={estilos.rolagem}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={checarTodos} tintColor={cores.primaria} />
        }>
        <View style={estilos.titulos}>
          <Text style={estilos.marca}>PISA LEVE</Text>
          <Text style={estilos.titulo} accessibilityRole="header">
            Alertas
          </Text>
          <Text style={estilos.subtitulo}>Novidades nos lugares que você frequenta</Text>
        </View>

        {carregandoLocais ? (
          <View style={estilos.carregando}>
            <Carregando />
          </View>
        ) : locais.length === 0 ? (
          <View style={estilos.vazio}>
            <View style={estilos.vazioIcone}>
              <Icone nome="sino" cor={cores.primaria} tamanho={30} />
            </View>
            <Text style={estilos.vazioTitulo}>Nenhum local monitorado</Text>
            <Text style={estilos.vazioTexto}>
              Adicione sua casa, o trabalho ou uma trilha que você costuma fazer. O app avisa quando
              alguém registrar ali um animal peçonhento ou ligado às suas alergias.
            </Text>
            <Botao titulo="Adicionar meu primeiro local" icone="mais" onPress={novoLocal} />
            <Text style={estilos.vazioDica}>
              Também dá para monitorar uma trilha pelo botão “Monitorar” no detalhe dela.
            </Text>
          </View>
        ) : (
          <>
            <View
              style={[
                estilos.resumo,
                totalNovos > 0 && (temPeconhento ? estilos.resumoPerigo : estilos.resumoAviso),
              ]}
              accessibilityLiveRegion="polite">
              <Icone
                nome={totalNovos > 0 ? 'perigo' : 'escudo'}
                cor={
                  totalNovos === 0
                    ? cores.riscoBaixo
                    : temPeconhento
                      ? cores.perigoTexto
                      : cores.avisoTexto
                }
                tamanho={26}
              />
              <View style={estilos.resumoTextos}>
                <Text
                  style={[
                    estilos.resumoTitulo,
                    totalNovos > 0 && {
                      color: temPeconhento ? cores.perigoTexto : cores.avisoTexto,
                    },
                  ]}>
                  {conferindo && totalNovos === 0
                    ? 'Conferindo seus locais…'
                    : totalNovos > 0
                      ? `${totalNovos} ${totalNovos === 1 ? 'registro novo' : 'registros novos'} em ${locaisComNovos} ${locaisComNovos === 1 ? 'local' : 'locais'}`
                      : 'Nada novo nos seus locais'}
                </Text>
                <Text style={estilos.resumoDetalhe}>
                  {comErro > 0
                    ? `${comErro} ${comErro === 1 ? 'local não pôde' : 'locais não puderam'} ser conferidos. Puxe para tentar de novo.`
                    : checadoEm
                      ? `Conferido às ${hora(checadoEm)} · puxe para atualizar`
                      : 'Puxe para atualizar'}
                </Text>
              </View>
              <Pressable
                onPress={checarTodos}
                disabled={conferindo}
                accessibilityRole="button"
                accessibilityLabel="Conferir os locais de novo"
                hitSlop={8}>
                {conferindo ? (
                  <Carregando tamanho="pequeno" corFundo={cores.superficie} />
                ) : (
                  <Icone nome="recarregar" cor={cores.textoSecundario} tamanho={20} />
                )}
              </Pressable>
            </View>

            <View style={estilos.bloco}>
              <View style={estilos.secao}>
                <Text style={estilos.secaoTitulo} accessibilityRole="header">
                  Meus locais
                </Text>
                <Text style={estilos.contagem}>
                  {locais.length} de {MAX_LOCAIS}
                </Text>
              </View>
              <View style={estilos.lista}>
                {ordenados.map((l) => (
                  <CartaoLocal key={l.id} local={l} estado={estados[l.id]} onPress={abrir} />
                ))}
              </View>
              {!cheio && (
                <Botao
                  titulo="Adicionar local"
                  variante="secundario"
                  icone="mais"
                  onPress={novoLocal}
                />
              )}
            </View>
          </>
        )}

        <View style={estilos.cartaoMenu}>
          <LinhaMenu
            primeira
            icone="coracao"
            titulo="Animais e trilhas salvos"
            valor={String(animaisSalvos + favoritas.length)}
            onPress={() => router.push('/alertas/salvos')}
          />
        </View>

        <Text style={estilos.fonte}>
          Os locais são conferidos quando você abre o app. Entram também registros que a comunidade
          ainda não confirmou. Fonte: iNaturalist.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  rolagem: {
    paddingHorizontal: espacos.xl,
    paddingTop: espacos.md,
    paddingBottom: espacos.xxl,
    gap: espacos.lg,
  },
  titulos: {
    gap: espacos.xs,
  },
  marca: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.primariaMedia,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 24,
    lineHeight: 29,
    color: cores.primaria,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  carregando: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  resumo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.md,
    padding: 14,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  resumoPerigo: {
    backgroundColor: cores.perigoFundo,
    borderColor: cores.erroBorda,
  },
  resumoAviso: {
    backgroundColor: cores.avisoFundo,
    borderColor: cores.avisoBorda,
  },
  resumoTextos: {
    flex: 1,
    gap: 2,
  },
  resumoTitulo: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    color: cores.texto,
  },
  resumoDetalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSecundario,
  },
  bloco: {
    gap: espacos.md,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  secaoTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  contagem: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  lista: {
    gap: 10,
  },
  vazio: {
    alignItems: 'center',
    gap: espacos.md,
    paddingVertical: espacos.xl,
    paddingHorizontal: espacos.lg,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.bordaForte,
  },
  vazioIcone: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.selecionado,
  },
  vazioTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 16,
    color: cores.primaria,
  },
  vazioTexto: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: cores.textoSecundario,
  },
  vazioDica: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    color: cores.textoSecundario,
  },
  cartaoMenu: {
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    overflow: 'hidden',
  },
  fonte: {
    fontFamily: fontes.regular,
    fontSize: 11,
    lineHeight: 16,
    color: cores.textoSecundario,
  },
});
