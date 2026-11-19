import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { CartaoAvistamento } from '@/components/CartaoAvistamento';
import { ChipFiltro } from '@/components/ChipFiltro';
import { Icone } from '@/components/Icone';
import { MapaAvistamentos } from '@/components/MapaAvistamentos';
import { gruposDeAlergias } from '@/constants/alergias';
import { FILTROS, TAXONS_POR_ALERGIA, taxonsDasAlergias, type Filtro } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import {
  buscarAvistamentos,
  buscarNomeDoLugar,
  ErroApi,
  type Avistamento,
  type ResultadoAvistamentos,
} from '@/services/inaturalist';
import { ErroLocalizacao, pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';
import { iniciais } from '@/utils/texto';

const RAIOS_KM = [2, 5, 10, 20];
const NA_FAIXA = 10; // cartões antes do "Ver todos"

const rotuloPorId = new Map(
  gruposDeAlergias.flatMap((g) => g.itens).map((item) => [item.id, item.rotulo]),
);

type EstadoLocal =
  | { tipo: 'procurando' }
  | { tipo: 'erro'; mensagem: string; podePedirDeNovo: boolean }
  | { tipo: 'pronto'; centro: Coordenadas };

export default function Explorar() {
  const { usuario, perfil } = useSessao();

  const [local, setLocal] = useState<EstadoLocal>({ tipo: 'procurando' });
  const [nomeLugar, setNomeLugar] = useState<string | null>(null);
  const [raioKm, setRaioKm] = useState(5);
  const [painelRaio, setPainelRaio] = useState(false);
  const [painelFiltro, setPainelFiltro] = useState(false);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [verTodos, setVerTodos] = useState(false);

  const [dados, setDados] = useState<ResultadoAvistamentos | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativa, setTentativa] = useState(0); // muda pra buscar de novo
  const [puxando, setPuxando] = useState(false);

  // Só alergias que viram grupo de bicho/planta no iNaturalist
  const alergiasDoMapa = (perfil?.selecionadas ?? []).filter((id) => TAXONS_POR_ALERGIA[id]);
  const chaveAlergias = alergiasDoMapa.join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  async function localizar() {
    setLocal({ tipo: 'procurando' });
    try {
      const centro = await pegarLocalizacaoAtual();
      setLocal({ tipo: 'pronto', centro });
      // Nome da cidade é enfeite: se falhar, fica "Sua localização"
      buscarNomeDoLugar(centro)
        .then(setNomeLugar)
        .catch(() => setNomeLugar(null));
    } catch (e) {
      setLocal({
        tipo: 'erro',
        mensagem: e instanceof ErroLocalizacao ? e.message : 'Não deu para achar sua localização.',
        podePedirDeNovo: e instanceof ErroLocalizacao ? e.podePedirDeNovo : true,
      });
    } finally {
      setPuxando(false);
    }
  }

  useEffect(() => {
    localizar();
  }, []);

  const centro = local.tipo === 'pronto' ? local.centro : null;

  // Busca de novo quando muda local, raio ou alergias
  useEffect(() => {
    if (!centro) return;
    let cancelado = false; // resposta velha não sobrescreve a nova

    setCarregando(true);
    setErro(null);
    buscarAvistamentos({ centro, raioKm, taxonsAlergia })
      .then((resultado) => {
        if (!cancelado) setDados(resultado);
      })
      .catch((e) => {
        if (!cancelado) {
          setErro(e instanceof ErroApi ? e.message : 'Algo deu errado ao buscar os avistamentos.');
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCarregando(false);
          setPuxando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, [centro, raioKm, taxonsAlergia, tentativa]);

  function atualizar() {
    setPuxando(true);
    if (local.tipo === 'pronto') setTentativa((t) => t + 1);
    else localizar();
  }

  const avistamentos = dados?.avistamentos ?? [];
  const filtrados = avistamentos.filter((a) =>
    filtro === 'todos' ? true : filtro === 'alergia' ? a.alergia : a.grupo === filtro,
  );
  const naLista = verTodos ? filtrados : filtrados.slice(0, NA_FAIXA);
  const filtros = FILTROS.filter((f) => f.id !== 'alergia' || taxonsAlergia.length > 0);
  const rotuloFiltro = FILTROS.find((f) => f.id === filtro)?.rotulo ?? 'Todos';

  function abrir(a: Avistamento) {
    router.push({ pathname: '/animal/[id]', params: { id: String(a.taxonId) } });
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={estilos.rolagem}
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={atualizar} tintColor={cores.primaria} />
        }>
        <View style={estilos.cabecalho}>
          <View style={estilos.titulos}>
            <Text style={estilos.marca}>PISA LEVE</Text>
            <Text style={estilos.titulo} accessibilityRole="header">
              Explore sua região
            </Text>
            <Text style={estilos.subtitulo}>Fique atento ao que está por perto</Text>
          </View>
          <Pressable
            onPress={() => router.navigate('/perfil')}
            accessibilityRole="button"
            accessibilityLabel="Abrir meu perfil"
            style={estilos.avatar}>
            <Text style={estilos.avatarTexto}>{iniciais(usuario?.nome ?? '')}</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setPainelRaio((aberto) => !aberto);
            setPainelFiltro(false);
          }}
          accessibilityRole="button"
          accessibilityState={{ expanded: painelRaio }}
          accessibilityHint="Mostra as opções de raio de busca"
          style={estilos.local}>
          <Icone nome="pin" cor={cores.primariaMedia} />
          <Text style={estilos.localTexto} numberOfLines={1}>
            {nomeLugar ?? 'Sua localização'} · raio de {raioKm} km
          </Text>
          <Icone
            nome={painelRaio ? 'recolher' : 'expandir'}
            cor={cores.textoSecundario}
            tamanho={18}
          />
        </Pressable>

        {painelRaio && (
          <View style={estilos.painel}>
            <Text style={estilos.painelTitulo}>Raio de busca</Text>
            <View style={estilos.linhaChips} accessibilityRole="radiogroup">
              {RAIOS_KM.map((km) => (
                <ChipFiltro
                  key={km}
                  rotulo={`${km} km`}
                  ativo={km === raioKm}
                  onPress={() => {
                    setRaioKm(km);
                    setPainelRaio(false);
                  }}
                />
              ))}
            </View>
            <Pressable
              onPress={() => {
                setPainelRaio(false);
                localizar();
              }}
              accessibilityRole="button"
              style={estilos.atualizarLocal}>
              <Icone nome="mira" cor={cores.primariaMedia} tamanho={18} />
              <Text style={estilos.link}>Usar minha localização atual</Text>
            </Pressable>
          </View>
        )}

        {local.tipo === 'erro' ? (
          <View style={estilos.bloco}>
            <AvisoErro titulo="Sem localização" mensagem={local.mensagem} />
            {local.podePedirDeNovo && (
              <Botao
                titulo="Tentar de novo"
                variante="secundario"
                icone="recarregar"
                onPress={localizar}
              />
            )}
          </View>
        ) : (
          <>
            {dados && dados.totalAlergia > 0 && (
              <Pressable
                onPress={() => setFiltro('alergia')}
                accessibilityRole="button"
                accessibilityHint="Mostra só os avistamentos ligados às suas alergias"
                style={estilos.aviso}>
                <Icone nome="alerta" cor={cores.avisoTexto} />
                <Text style={estilos.avisoTexto}>
                  <Text style={estilos.avisoForte}>
                    {dados.totalAlergia}{' '}
                    {dados.totalAlergia === 1 ? 'registro ligado' : 'registros ligados'} às suas
                    alergias a até {raioKm} km.
                  </Text>{' '}
                  Você marcou: {alergiasDoMapa.map((id) => rotuloPorId.get(id) ?? id).join(', ')}.
                </Text>
              </Pressable>
            )}

            <Pressable
              onPress={() => {
                setPainelFiltro((aberto) => !aberto);
                setPainelRaio(false);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: painelFiltro }}
              accessibilityLabel={`Filtros. Mostrando: ${rotuloFiltro}`}
              style={({ pressed }) => [
                estilos.botaoFiltro,
                filtro !== 'todos' && estilos.botaoFiltroAtivo,
                pressed && { opacity: 0.85 },
              ]}>
              <Icone nome="filtro" cor={cores.primaria} tamanho={18} />
              <Text style={estilos.botaoFiltroTexto}>Filtros</Text>
              <View
                style={[
                  estilos.filtroAtual,
                  filtro === 'alergia' && { backgroundColor: cores.avisoFundo },
                ]}>
                <Text
                  style={[
                    estilos.filtroAtualTexto,
                    filtro === 'alergia' && { color: cores.avisoTexto },
                  ]}>
                  {rotuloFiltro}
                </Text>
              </View>
              <View style={{ flex: 1 }} />
              <Icone
                nome={painelFiltro ? 'recolher' : 'expandir'}
                cor={cores.textoSecundario}
                tamanho={18}
              />
            </Pressable>

            {painelFiltro && (
              <View style={estilos.painel}>
                <Text style={estilos.painelTitulo}>Mostrar</Text>
                <View style={estilos.linhaChips} accessibilityRole="radiogroup">
                  {filtros.map((f) => (
                    <ChipFiltro
                      key={f.id}
                      rotulo={f.rotulo}
                      ativo={filtro === f.id}
                      onPress={() => {
                        setFiltro(f.id);
                        setPainelFiltro(false);
                      }}
                      tom={f.id === 'alergia' ? 'aviso' : 'normal'}
                      icone={f.id === 'alergia' ? 'alerta' : undefined}
                    />
                  ))}
                </View>
              </View>
            )}

            <View style={estilos.mapa}>
              {centro ? (
                <MapaAvistamentos
                  centro={centro}
                  raioKm={raioKm}
                  avistamentos={filtrados}
                  onAbrir={abrir}
                />
              ) : (
                <Carregando texto="Procurando sua localização…" />
              )}
              {centro && carregando && (
                <View style={estilos.mapaCobertura}>
                  <Carregando texto="Buscando avistamentos…" />
                </View>
              )}
              {dados && !carregando && (
                <View style={estilos.selo} pointerEvents="none">
                  <Text style={estilos.seloTexto}>
                    {dados.total} {dados.total === 1 ? 'avistamento' : 'avistamentos'} · iNaturalist
                  </Text>
                </View>
              )}
            </View>

            {erro && (
              <View style={estilos.bloco}>
                <AvisoErro titulo="Não deu para carregar os avistamentos" mensagem={erro} />
                <Botao
                  titulo="Tentar de novo"
                  variante="secundario"
                  icone="recarregar"
                  onPress={() => setTentativa((t) => t + 1)}
                />
              </View>
            )}

            {dados && !erro && (
              <>
                <View style={estilos.secao}>
                  <Text style={estilos.secaoTitulo} accessibilityRole="header">
                    Avistamentos próximos
                  </Text>
                  {filtrados.length > NA_FAIXA && (
                    <Pressable
                      onPress={() => setVerTodos((v) => !v)}
                      accessibilityRole="button"
                      hitSlop={8}>
                      <Text style={estilos.link}>{verTodos ? 'Ver menos' : 'Ver todos'}</Text>
                    </Pressable>
                  )}
                </View>

                {filtrados.length === 0 ? (
                  <View style={estilos.vazio}>
                    <Icone nome="folha" cor={cores.primariaMedia} tamanho={26} />
                    <Text style={estilos.vazioTexto}>
                      Nenhum avistamento confirmado {filtro === 'todos' ? '' : 'desse tipo '}a até{' '}
                      {raioKm} km. Tente aumentar o raio.
                    </Text>
                  </View>
                ) : verTodos ? (
                  <View style={estilos.grade}>
                    {naLista.map((a) => (
                      <CartaoAvistamento key={a.id} avistamento={a} onPress={() => abrir(a)} />
                    ))}
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={estilos.faixaCartoes}
                    style={estilos.faixa}>
                    {naLista.map((a) => (
                      <CartaoAvistamento
                        key={a.id}
                        avistamento={a}
                        largura={150}
                        onPress={() => abrir(a)}
                      />
                    ))}
                  </ScrollView>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Carregando({ texto }: { texto: string }) {
  return (
    <View style={estilos.carregando} accessibilityRole="progressbar" accessibilityLabel={texto}>
      <ActivityIndicator color={cores.primaria} />
      <Text style={estilos.carregandoTexto}>{texto}</Text>
    </View>
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
    gap: 14,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacos.md,
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
    fontSize: 24,
    lineHeight: 29,
    color: cores.primaria,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTexto: {
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.superficie,
  },
  local: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  localTexto: {
    flex: 1,
    fontFamily: fontes.media,
    fontSize: 14,
    color: cores.texto,
  },
  painel: {
    marginTop: -6,
    padding: 14,
    gap: 10,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  painelTitulo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  atualizarLocal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 32,
  },
  link: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  bloco: {
    gap: espacos.md,
  },
  aviso: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: espacos.md,
    paddingHorizontal: 14,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.avisoBorda,
    backgroundColor: cores.avisoFundo,
  },
  avisoTexto: {
    flex: 1,
    fontFamily: fontes.regular,
    fontSize: 13,
    lineHeight: 19,
    color: cores.avisoTexto,
  },
  avisoForte: {
    fontFamily: fontes.negrito,
  },
  botaoFiltro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.sm,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  botaoFiltroAtivo: {
    borderColor: cores.primariaMedia,
  },
  botaoFiltroTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.texto,
  },
  filtroAtual: {
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: cores.selecionado,
  },
  filtroAtualTexto: {
    fontFamily: fontes.negrito,
    fontSize: 12,
    color: cores.primaria,
  },
  linhaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  mapa: {
    height: 300,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.mapaFundo,
  },
  mapaCobertura: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(238, 244, 236, 0.75)',
  },
  selo: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  seloTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 11,
    color: cores.textoSecundario,
  },
  carregando: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacos.sm,
  },
  carregandoTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.textoSecundario,
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
  faixa: {
    marginHorizontal: -espacos.xl,
  },
  faixaCartoes: {
    gap: 10,
    paddingHorizontal: espacos.xl,
  },
  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
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
});
