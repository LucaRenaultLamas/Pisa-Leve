import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { ICONE_TIPO, resumoDoLocal } from '@/components/CartaoLocal';
import { CartaoRegistro } from '@/components/CartaoRegistro';
import { Icone, type NomeIcone } from '@/components/Icone';
import { MapaAvistamentos } from '@/components/MapaAvistamentos';
import { TAXONS_POR_ALERGIA } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useAlertas } from '@/contexts/alertas';
import { useSessao } from '@/contexts/sessao';
import { DIAS_HISTORICO, formatarRaio, ROTULO_TIPO, type RegistroLocal } from '@/services/locais';

export default function DetalheLocal() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSessao();
  const { locais, estados, checar, marcarVisto } = useAlertas();
  const local = locais.find((l) => l.id === id);
  const estado = local ? estados[local.id] : undefined;

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/alertas'));

  const abrir = useCallback((r: RegistroLocal) => {
    router.push({
      pathname: '/animal/[id]',
      params: { id: String(r.taxonId), avistamento: String(r.id) },
    });
  }, []);

  if (!local) {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
        <View style={estilos.barraTopo}>
          <BotaoRedondo icone="voltar" rotulo="Voltar" onPress={voltar} />
        </View>
        <View style={estilos.centro}>
          <AvisoErro titulo="Local não encontrado" mensagem="Ele pode ter sido excluído." />
          <Botao titulo="Ir para Alertas" variante="secundario" onPress={voltar} />
        </View>
      </SafeAreaView>
    );
  }

  const resumo = resumoDoLocal(estado);
  const registros = estado?.tipo === 'pronto' ? estado.registros : [];
  const novos = registros.filter((r) => r.novo);
  const corAviso = novos.some((r) => r.peconhento) ? cores.perigoTexto : cores.avisoTexto;
  const antigos = registros.filter((r) => !r.novo);
  const semAlergiaComBicho = !(perfil?.selecionadas ?? []).some((a) => TAXONS_POR_ALERGIA[a]);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={estilos.rolagem}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => checar(local)}
            tintColor={cores.primaria}
          />
        }>
        <View style={estilos.barraTopo}>
          <BotaoRedondo icone="voltar" rotulo="Voltar" onPress={voltar} />
          <BotaoRedondo
            icone="editar"
            rotulo="Editar local"
            onPress={() => router.push({ pathname: '/local/novo', params: { id: local.id } })}
          />
        </View>

        <View style={estilos.cabecalho}>
          <View style={[estilos.iconeTipo, { backgroundColor: resumo.fundo }]}>
            <Icone nome={ICONE_TIPO[local.tipo]} cor={resumo.cor} tamanho={26} />
          </View>
          <View style={estilos.titulos}>
            <Text style={estilos.marca}>LOCAL MONITORADO</Text>
            <Text style={estilos.titulo} accessibilityRole="header">
              {local.nome}
            </Text>
            <Text style={estilos.subtitulo}>
              {ROTULO_TIPO[local.tipo]} · a até {formatarRaio(local.raioKm)}
            </Text>
          </View>
        </View>

        {novos.length > 0 && (
          <View style={[estilos.aviso, { backgroundColor: resumo.fundo, borderColor: resumo.cor }]}>
            <View style={estilos.avisoLinha}>
              <Icone nome="perigo" cor={corAviso} tamanho={22} />
              <Text style={[estilos.avisoTexto, { color: corAviso }]}>
                {resumo.texto} desde a última vez que você olhou
              </Text>
            </View>
            <Botao
              titulo="Marcar como visto"
              variante="secundario"
              icone="check"
              onPress={() => marcarVisto(local.id)}
            />
          </View>
        )}

        <View style={estilos.mapa}>
          <MapaAvistamentos
            centro={local.ponto}
            raioKm={local.raioKm}
            avistamentos={registros}
            onAbrir={(a) => abrir(a as RegistroLocal)}
            centroEhVoce={false}
          />
        </View>

        {semAlergiaComBicho && (
          <Text style={estilos.nota}>
            Seu perfil não tem alergia ligada a animais: só os peçonhentos entram nos alertas.
          </Text>
        )}

        {!estado || estado.tipo === 'carregando' ? (
          <View style={estilos.carregando} accessibilityRole="progressbar">
            <Carregando />
            <Text style={estilos.carregandoTexto}>Conferindo os registros deste local…</Text>
          </View>
        ) : estado.tipo === 'erro' ? (
          <View style={estilos.bloco}>
            <AvisoErro titulo="Não deu para conferir este local" mensagem={estado.mensagem} />
            <Botao
              titulo="Tentar de novo"
              variante="secundario"
              icone="recarregar"
              onPress={() => checar(local)}
            />
          </View>
        ) : registros.length === 0 ? (
          <View style={estilos.vazio}>
            <Icone nome="escudo" cor={cores.riscoBaixo} tamanho={28} />
            <Text style={estilos.vazioTexto}>
              Nada peçonhento nem ligado às suas alergias foi registrado aqui nos últimos{' '}
              {DIAS_HISTORICO} dias.
            </Text>
          </View>
        ) : (
          <>
            {novos.length > 0 && (
              <Secao titulo="Novos" quantidade={novos.length}>
                {novos.map((r) => (
                  <CartaoRegistro key={r.id} registro={r} onPress={abrir} />
                ))}
              </Secao>
            )}
            {antigos.length > 0 && (
              <Secao
                titulo={novos.length > 0 ? 'Já vistos' : 'Registros recentes'}
                quantidade={antigos.length}>
                {antigos.map((r) => (
                  <CartaoRegistro key={r.id} registro={r} onPress={abrir} />
                ))}
              </Secao>
            )}
          </>
        )}

        <Text style={estilos.fonte}>
          Registros enviados ao iNaturalist nos últimos {DIAS_HISTORICO} dias (ou desde a última vez
          que você olhou) de animais vistos no último ano, incluindo os que a comunidade ainda não
          confirmou.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Secao({
  titulo,
  quantidade,
  children,
}: {
  titulo: string;
  quantidade: number;
  children: ReactNode;
}) {
  return (
    <View style={estilos.bloco}>
      <View style={estilos.secao}>
        <Text style={estilos.secaoTitulo} accessibilityRole="header">
          {titulo}
        </Text>
        <Text style={estilos.contagem}>
          {quantidade} {quantidade === 1 ? 'registro' : 'registros'}
        </Text>
      </View>
      <View style={estilos.lista}>{children}</View>
    </View>
  );
}

function BotaoRedondo({
  icone,
  rotulo,
  onPress,
}: {
  icone: NomeIcone;
  rotulo: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      hitSlop={4}
      style={({ pressed }) => [estilos.botaoRedondo, pressed && { opacity: 0.7 }]}>
      <Icone nome={icone} cor={cores.primaria} tamanho={22} />
    </Pressable>
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
  centro: {
    flex: 1,
    justifyContent: 'center',
    gap: espacos.md,
    padding: espacos.xl,
  },
  barraTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  botaoRedondo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconeTipo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulos: {
    flex: 1,
    gap: 4,
  },
  marca: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.primariaMedia,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 22,
    lineHeight: 28,
    color: cores.primaria,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  aviso: {
    gap: espacos.md,
    padding: 14,
    borderRadius: raios.lg,
    borderWidth: 1,
  },
  avisoLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fontes.negrito,
    fontSize: 14,
    lineHeight: 20,
  },
  mapa: {
    height: 260,
    borderRadius: raios.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.borda,
  },
  nota: {
    marginTop: -espacos.sm,
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSecundario,
  },
  carregando: {
    alignItems: 'center',
    gap: espacos.sm,
    paddingVertical: 30,
  },
  carregandoTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  vazio: {
    alignItems: 'center',
    gap: espacos.sm,
    paddingVertical: espacos.xl,
    paddingHorizontal: espacos.lg,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.bordaForte,
  },
  vazioTexto: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
  fonte: {
    fontFamily: fontes.regular,
    fontSize: 11,
    lineHeight: 16,
    color: cores.textoSecundario,
  },
});
