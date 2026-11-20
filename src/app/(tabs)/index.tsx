import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { BarraFiltros, type CampoFiltro, type FiltroAplicado } from '@/components/BarraFiltros';
import { Botao } from '@/components/Botao';
import { CarrosselLento } from '@/components/CarrosselLento';
import { CartaoAvistamento } from '@/components/CartaoAvistamento';
import { Icone } from '@/components/Icone';
import { MapaAvistamentos } from '@/components/MapaAvistamentos';
import { PopupAvistamentos } from '@/components/PopupAvistamentos';
import { gruposDeAlergias } from '@/constants/alergias';
import { PINS, TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import {
  buscarAvistamentos,
  buscarNomeDoLugar,
  ErroApi,
  type Avistamento,
  type ResultadoAvistamentos,
} from '@/services/inaturalist';
import {
  acompanharLocalizacao,
  ErroLocalizacao,
  pegarLocalizacaoAtual,
  type Coordenadas,
} from '@/services/localizacao';
import { distanciaKm } from '@/utils/geo';

const RAIOS_KM = [2, 5, 10, 20, 40, 80];
// "Ampliar o raio" dobra até aqui; mais que isso a lista de 80 recentes já não representa a área
const RAIO_MAX_KM = 80;
const NA_FAIXA = 10; // cartões antes do "Ver todos"
// Andou menos que isso: não vale buscar tudo de novo
const MUDANCA_MIN_KM = 0.5;

const rotuloPorId = new Map(
  gruposDeAlergias.flatMap((g) => g.itens).map((item) => [item.id, item.rotulo]),
);

function camposDeFiltro(
  temAlergia: boolean,
  nomeLugar: string | null,
  usarLocalAtual: () => void,
): CampoFiltro[] {
  return [
    {
      id: 'raio',
      rotulo: 'Raio de busca',
      rotuloFicha: nomeLugar ?? 'Sua localização',
      icone: 'pin',
      fixo: true,
      operadores: [{ valor: 'ate', rotulo: 'até' }],
      opcoes: RAIOS_KM.map((km) => ({ valor: String(km), rotulo: `${km} km` })),
      acoes: [{ rotulo: 'Usar localização atual', icone: 'mira', onPress: usarLocalAtual }],
    },
    {
      id: 'grupo',
      rotulo: 'Grupo',
      icone: 'folha',
      operadores: [
        { valor: 'e', rotulo: 'é' },
        { valor: 'qualquer', rotulo: 'é um destes', varios: true },
        { valor: 'nao_e', rotulo: 'não é', varios: true },
      ],
      opcoes: [
        { valor: 'cobra', rotulo: 'Cobras', cor: PINS.cobra.cor },
        { valor: 'aranha', rotulo: 'Aranhas', cor: PINS.aranha.cor },
        { valor: 'escorpiao', rotulo: 'Escorpiões', cor: PINS.escorpiao.cor },
        { valor: 'outro', rotulo: 'Outros', cor: PINS.outro.cor },
      ],
    },
    {
      id: 'risco',
      rotulo: 'Risco',
      icone: 'alerta',
      operadores: [
        { valor: 'qualquer', rotulo: 'é um destes', varios: true },
        { valor: 'nenhum', rotulo: 'nenhum destes', varios: true },
      ],
      opcoes: [
        { valor: 'peconhento', rotulo: 'Peçonhento', cor: cores.perigoTexto },
        // Só aparece se o perfil tem alergia que vira bicho no iNaturalist
        ...(temAlergia ? [{ valor: 'alergia', rotulo: 'Sua alergia', cor: PINS.alergia.cor }] : []),
      ],
    },
    {
      id: 'quando',
      rotulo: 'Quando',
      icone: 'relogio',
      operadores: [{ valor: 'e', rotulo: 'é' }],
      opcoes: [
        { valor: 'mes', rotulo: 'Este mês' },
        { valor: '7', rotulo: 'Últimos 7 dias' },
        { valor: '30', rotulo: 'Últimos 30 dias' },
        { valor: '365', rotulo: 'Últimos 12 meses' },
      ],
    },
  ];
}

// Filtro sem valor escolhido ainda não corta nada
function passaNoFiltro(a: Avistamento, f: FiltroAplicado) {
  if (f.valores.length === 0) return true;
  if (f.campo === 'grupo') {
    const tem = f.valores.includes(a.grupo);
    return f.operador === 'nao_e' ? !tem : tem;
  }
  if (f.campo === 'risco') {
    const tem = f.valores.some((v) => (v === 'peconhento' ? a.peconhento : a.alergia));
    return f.operador === 'nenhum' ? !tem : tem;
  }
  if (f.campo === 'quando') {
    if (!a.data) return false;
    if (f.valores[0] === 'mes') {
      // Data local, não UTC: dia 30 às 22h no Brasil já é o mês seguinte em UTC
      const hoje = new Date();
      const mes = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
      return a.data.startsWith(mes);
    }
    const dias = (Date.now() - new Date(`${a.data.slice(0, 10)}T12:00:00`).getTime()) / 86_400_000;
    return dias <= Number(f.valores[0]);
  }
  return true;
}

// Data local "AAAA-MM-DD" (toISOString é UTC e erra o dia à noite no Brasil)
function diaLocal(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// O "Quando" vai pra própria busca: total do mapa, aviso e lista contam o mesmo período
function desdeDoFiltro(filtros: FiltroAplicado[]) {
  const valor = filtros.find((f) => f.campo === 'quando')?.valores[0];
  if (!valor) return null;
  const hoje = new Date();
  if (valor === 'mes') return diaLocal(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  return diaLocal(new Date(hoje.getTime() - Number(valor) * 86_400_000));
}

const TEXTO_PERIODO: Record<string, string> = {
  mes: 'este mês',
  '7': 'nos últimos 7 dias',
  '30': 'nos últimos 30 dias',
  '365': 'nos últimos 12 meses',
};

// Abre mostrando só o mês atual; dá pra trocar ou tirar a ficha
const FILTROS_INICIAIS: FiltroAplicado[] = [
  { id: 'raio', campo: 'raio', operador: 'ate', valores: ['5'] },
  { id: 'padrao-mes', campo: 'quando', operador: 'e', valores: ['mes'] },
];

type EstadoLocal =
  | { tipo: 'procurando' }
  | { tipo: 'erro'; mensagem: string; podePedirDeNovo: boolean }
  | { tipo: 'pronto'; centro: Coordenadas };

export default function Explorar() {
  const { perfil } = useSessao();

  const [local, setLocal] = useState<EstadoLocal>({ tipo: 'procurando' });
  const [nomeLugar, setNomeLugar] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<FiltroAplicado[]>(FILTROS_INICIAIS);
  const [popupTodos, setPopupTodos] = useState(false);

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

  function mudarCentro(centro: Coordenadas) {
    setLocal({ tipo: 'pronto', centro });
    // Nome da cidade é enfeite: se falhar, fica "Sua localização"
    buscarNomeDoLugar(centro)
      .then(setNomeLugar)
      .catch(() => setNomeLugar(null));
  }

  async function localizar() {
    setLocal({ tipo: 'procurando' });
    try {
      mudarCentro(await pegarLocalizacaoAtual());
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
  const centroAgora = useRef(centro);
  centroAgora.current = centro;

  // Depois da 1ª posição, segue a pessoa: andou 500 m, centro, mapa e lista acompanham
  const temLocal = local.tipo === 'pronto';
  useEffect(() => {
    if (!temLocal) return;
    let parar: (() => void) | null = null;
    let desmontou = false;
    acompanharLocalizacao((novo) => {
      const atual = centroAgora.current;
      if (atual && distanciaKm(atual, novo) < MUDANCA_MIN_KM) return;
      mudarCentro(novo);
    }, MUDANCA_MIN_KM * 1000)
      .then((fn) => {
        if (desmontou) fn();
        else parar = fn;
      })
      .catch(() => {
        // Sem acompanhar, a pessoa ainda pode puxar a tela pra atualizar
      });
    return () => {
      desmontou = true;
      parar?.();
    };
  }, [temLocal]);

  const desde = desdeDoFiltro(filtros);
  const raioKm = Number(filtros.find((f) => f.campo === 'raio')?.valores[0] ?? 5);

  function mudarRaio(km: number) {
    setFiltros((fs) => fs.map((f) => (f.campo === 'raio' ? { ...f, valores: [String(km)] } : f)));
  }

  // Busca de novo quando muda local, raio, alergias ou período
  useEffect(() => {
    if (!centro) return;
    let cancelado = false; // resposta velha não sobrescreve a nova

    setCarregando(true);
    setErro(null);
    buscarAvistamentos({ centro, raioKm, taxonsAlergia, desde })
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
  }, [centro, raioKm, taxonsAlergia, desde, tentativa]);

  function atualizar() {
    setPuxando(true);
    if (local.tipo === 'pronto') setTentativa((t) => t + 1);
    else localizar();
  }

  const avistamentos = dados?.avistamentos ?? [];
  const filtrados = avistamentos.filter((a) => filtros.every((f) => passaNoFiltro(a, f)));
  const filtrando = filtros.some((f) => f.campo !== 'raio' && f.valores.length > 0);
  // Grupo e Risco filtram aqui na tela (sobre os 80 mais recentes); o período já vem da API
  const filtraNaTela = filtros.some(
    (f) => f.campo !== 'quando' && f.campo !== 'raio' && f.valores.length > 0,
  );
  const valorPeriodo = filtros.find((f) => f.campo === 'quando')?.valores[0];
  const periodo = valorPeriodo ? ` ${TEXTO_PERIODO[valorPeriodo]}` : '';
  const naLista = filtrados.slice(0, NA_FAIXA);
  const campos = camposDeFiltro(taxonsAlergia.length > 0, nomeLugar, localizar);

  function abrir(a: Avistamento) {
    router.push({
      pathname: '/animal/[id]',
      params: { id: String(a.taxonId), avistamento: String(a.id) },
    });
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
        </View>

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
            <BarraFiltros campos={campos} valor={filtros} onChange={setFiltros} />

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
                    {filtraNaTela
                      ? `${filtrados.length} com esses filtros`
                      : `${dados.total} ${dados.total === 1 ? 'avistamento' : 'avistamentos'}${periodo}`}{' '}
                    · iNaturalist
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
                      onPress={() => setPopupTodos(true)}
                      accessibilityRole="button"
                      accessibilityHint="Abre a lista com todos os avistamentos"
                      hitSlop={8}>
                      <Text style={estilos.link}>Ver todos</Text>
                    </Pressable>
                  )}
                </View>

                {dados.totalAlergia > 0 && (
                  <Pressable
                    onPress={() =>
                      setFiltros([
                        ...filtros.filter((f) => f.campo !== 'risco'),
                        {
                          id: 'aviso-alergia',
                          campo: 'risco',
                          operador: 'qualquer',
                          valores: ['alergia'],
                        },
                      ])
                    }
                    accessibilityRole="button"
                    accessibilityHint="Mostra só os avistamentos ligados às suas alergias"
                    style={estilos.aviso}>
                    <Icone nome="alerta" cor={cores.avisoTexto} />
                    <Text style={estilos.avisoTexto}>
                      <Text style={estilos.avisoForte}>
                        {dados.totalAlergia}{' '}
                        {dados.totalAlergia === 1 ? 'registro ligado' : 'registros ligados'} às suas
                        alergias a até {raioKm} km{periodo}.
                      </Text>{' '}
                      Você marcou:{' '}
                      {alergiasDoMapa.map((id) => rotuloPorId.get(id) ?? id).join(', ')}.
                    </Text>
                  </Pressable>
                )}

                {filtrados.length === 0 ? (
                  <View style={estilos.vazio}>
                    <Icone nome="folha" cor={cores.primariaMedia} tamanho={26} />
                    <Text style={estilos.vazioTexto}>
                      Nenhum avistamento confirmado {filtrando ? 'com esses filtros ' : ''}a até{' '}
                      {raioKm} km.
                    </Text>
                    {raioKm * 2 <= RAIO_MAX_KM && (
                      <Botao
                        titulo={`Ampliar o raio para ${raioKm * 2} km`}
                        variante="secundario"
                        icone="mira"
                        onPress={() => mudarRaio(raioKm * 2)}
                      />
                    )}
                  </View>
                ) : (
                  <CarrosselLento
                    itens={naLista}
                    chave={(a) => a.id}
                    renderItem={(a) => (
                      <CartaoAvistamento avistamento={a} largura={150} onPress={() => abrir(a)} />
                    )}
                    style={estilos.faixa}
                    contentContainerStyle={estilos.faixaCartoes}
                  />
                )}
              </>
            )}
          </>
        )}
      </ScrollView>

      <PopupAvistamentos
        visivel={popupTodos}
        titulo={filtraNaTela ? 'Avistamentos filtrados' : `Avistamentos${periodo}`}
        avistamentos={filtrados}
        total={filtraNaTela ? filtrados.length : (dados?.total ?? filtrados.length)}
        onAbrir={abrir}
        onFechar={() => setPopupTodos(false)}
      />
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
