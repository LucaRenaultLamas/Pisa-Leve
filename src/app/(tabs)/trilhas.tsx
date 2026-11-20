import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoErro } from '@/components/AvisoErro';
import { BarraFiltros, type CampoFiltro, type FiltroAplicado } from '@/components/BarraFiltros';
import { Botao } from '@/components/Botao';
import { CartaoTrilha } from '@/components/CartaoTrilha';
import { ChipFiltro } from '@/components/ChipFiltro';
import { Icone } from '@/components/Icone';
import { TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { CENTRO_JF } from '@/constants/trilhasJF';
import { useFavoritas } from '@/contexts/favoritas';
import { useSessao } from '@/contexts/sessao';
import { buscarCidadesComTrilhas, CIDADE_JF, type Cidade } from '@/services/cidades';
import { ErroLocalizacao, pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';
import {
  alvoPerto,
  buscarTrilhas,
  RAIO_PERTO_KM,
  VALIDADE_MS,
  type AlvoBusca,
} from '@/services/buscaTrilhas';
import { ErroTrilhas } from '@/services/overpass';
import { calcularRisco, pesoRisco, type RiscoTrilha } from '@/services/risco';
import {
  juntarTrilhas,
  lembrarTrilha,
  lerTrilhasOsmSalvas,
  pontoMaisPerto,
  trilhasFixas,
  type Trilha,
} from '@/services/trilhas';
import { semAcento } from '@/utils/texto';

const ORDENS = [
  { id: 'perto', rotulo: 'Mais perto' },
  { id: 'seguras', rotulo: 'Mais seguras' },
  { id: 'curtas', rotulo: 'Mais curtas' },
] as const;
// Um pedido por trilha no iNaturalist: limita quantas ao mesmo tempo e no total
const RISCO_JUNTAS = 3;
const RISCO_MAX = 30;

const CAMPOS: CampoFiltro[] = [
  {
    id: 'ordem',
    rotulo: 'Ordenar',
    icone: 'ordenar',
    fixo: true,
    operadores: [{ valor: 'por', rotulo: 'por' }],
    opcoes: ORDENS.map((o) => ({ valor: o.id, rotulo: o.rotulo })),
  },
  {
    id: 'mostrar',
    rotulo: 'Mostrar',
    icone: 'coracao',
    operadores: [{ valor: 'so', rotulo: 'só' }],
    opcoes: [{ valor: 'favoritas', rotulo: 'Favoritas' }],
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
      { valor: 'baixo', rotulo: 'Baixo', cor: cores.riscoBaixo },
      { valor: 'medio', rotulo: 'Médio', cor: cores.riscoMedio },
      { valor: 'alto', rotulo: 'Alto', cor: cores.riscoAlto },
    ],
  },
  {
    id: 'tamanho',
    rotulo: 'Tamanho',
    icone: 'montanha',
    operadores: [{ valor: 'ate', rotulo: 'até' }],
    opcoes: [
      { valor: '1', rotulo: '1 km' },
      { valor: '3', rotulo: '3 km' },
      { valor: '10', rotulo: '10 km' },
    ],
  },
];

// Ficha sem valor não filtra; risco ainda calculando passa
function passaNoFiltro(t: Trilha, f: FiltroAplicado, risco: RiscoTrilha | null | undefined) {
  if (f.valores.length === 0 || f.campo === 'mostrar') return true;
  if (f.campo === 'risco') {
    if (!risco) return true;
    const tem = f.valores.includes(risco.nivel);
    return f.operador === 'nenhum' ? !tem : tem;
  }
  if (f.campo === 'tamanho') {
    return t.comprimentoKm !== null && t.comprimentoKm <= Number(f.valores[0]);
  }
  return true;
}
type Ordem = (typeof ORDENS)[number]['id'];

// A ordem é uma ficha fixa da barra: sempre tem um valor
const FILTROS_INICIAIS: FiltroAplicado[] = [
  { id: 'ordem', campo: 'ordem', operador: 'por', valores: ['perto'] },
];
type Escolha = 'perto' | number; // número = id da cidade no iNaturalist

type EstadoLocal =
  | { tipo: 'procurando' }
  | { tipo: 'erro'; mensagem: string; podePedirDeNovo: boolean }
  | { tipo: 'pronto'; centro: Coordenadas };

export default function Trilhas() {
  const { favoritas, ehFavorita, alternar } = useFavoritas();
  const { perfil } = useSessao();

  const [escolha, setEscolha] = useState<Escolha>('perto');
  const escolheu = useRef(false); // a pessoa já tocou em algum chip de local
  const [cidades, setCidades] = useState<Cidade[] | null>(null);
  const [conferindoCidades, setConferindoCidades] = useState(false);
  const [local, setLocal] = useState<EstadoLocal>({ tipo: 'procurando' });
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<FiltroAplicado[]>(FILTROS_INICIAIS);
  const ordem = (filtros.find((f) => f.campo === 'ordem')?.valores[0] ?? 'perto') as Ordem;
  const soFavoritas = filtros.some((f) => f.campo === 'mostrar' && f.valores.length > 0);
  const [riscos, setRiscos] = useState<Record<string, RiscoTrilha | null>>({});

  const [osm, setOsm] = useState<Trilha[] | null>(null);
  const [salvoEm, setSalvoEm] = useState<number | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [parcial, setParcial] = useState(false); // lista da busca rápida, a completa ainda não veio
  const [falha, setFalha] = useState<ErroTrilhas | null>(null);
  const [tentativa, setTentativa] = useState(0); // muda pra buscar de novo
  const [puxando, setPuxando] = useState(false);
  const forcar = useRef(false); // puxar/tentar de novo ignora a lista salva

  async function localizar() {
    setLocal({ tipo: 'procurando' });
    try {
      setLocal({ tipo: 'pronto', centro: await pegarLocalizacaoAtual() });
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

  // Só cidades vizinhas com trilha mapeada; sem localização, em volta de Juiz de Fora
  useEffect(() => {
    if (local.tipo === 'procurando') return;
    const ponto = local.tipo === 'pronto' ? local.centro : CENTRO_JF;
    let cancelado = false;
    setConferindoCidades(true);
    buscarCidadesComTrilhas(ponto, 5, (parciais) => {
      if (!cancelado) setCidades(parciais);
    })
      .then((achadas) => {
        if (!cancelado) setCidades(achadas);
      })
      .catch(() => {
        // Sem lista de cidades: JF tem as trilhas da lista fixa
        if (!cancelado) setCidades((atuais) => (atuais?.length ? atuais : [CIDADE_JF]));
      })
      .finally(() => {
        if (!cancelado) setConferindoCidades(false);
      });
    return () => {
      cancelado = true;
    };
  }, [local]);

  // Sem localização e sem escolha ainda: abre na cidade mais próxima
  useEffect(() => {
    if (local.tipo === 'erro' && !escolheu.current && cidades?.[0]) setEscolha(cidades[0].id);
  }, [local, cidades]);

  const cidade =
    typeof escolha === 'number' ? (cidades?.find((c) => c.id === escolha) ?? null) : null;
  const voce = local.tipo === 'pronto' ? local.centro : null;

  const alvo = useMemo((): AlvoBusca | null => {
    if (cidade) {
      return {
        chave: `cidade-${cidade.id}`,
        area: cidade.area,
        referencia: voce ?? cidade.centro,
        raioKm: null,
      };
    }
    if (escolha === 'perto' && voce) return alvoPerto(voce);
    return null;
  }, [cidade, escolha, voce]);

  useEffect(() => {
    if (!alvo) return;
    const aqui = alvo;
    let cancelado = false; // resposta velha não sobrescreve a nova
    let pararDeOuvir: (() => void) | undefined;
    const forcado = forcar.current;
    forcar.current = false;

    async function carregar() {
      setFalha(null);
      setParcial(false);
      const salvas = await lerTrilhasOsmSalvas(aqui.chave, aqui.referencia);
      if (cancelado) return;
      setOsm(salvas?.trilhas ?? null);
      setSalvoEm(salvas?.salvoEm ?? null);
      if (salvas && !forcado && Date.now() - salvas.salvoEm < VALIDADE_MS) {
        setPuxando(false);
        return;
      }

      setCarregando(true);
      // Pode já estar em andamento desde que o app abriu (preCarregarTrilhas).
      // Sem lista salva, a busca rápida mostra algo em segundos enquanto a completa demora
      const busca = buscarTrilhas(aqui, !salvas);
      let completaChegou = false;
      pararDeOuvir = busca.ouvir((rapidas) => {
        if (cancelado || completaChegou) return;
        // Distância de onde você está agora, não de quando a busca começou
        setOsm(rapidas.map((t) => ({ ...t, distanciaKm: pontoMaisPerto(aqui.referencia, t) })));
        setParcial(true);
      });
      try {
        const novas = await busca.completa;
        completaChegou = true;
        if (cancelado) return;
        setOsm(novas.map((t) => ({ ...t, distanciaKm: pontoMaisPerto(aqui.referencia, t) })));
        setParcial(false);
        setSalvoEm(Date.now());
      } catch (e) {
        if (!cancelado) setFalha(e instanceof ErroTrilhas ? e : new ErroTrilhas('fora'));
      } finally {
        if (!cancelado) {
          setCarregando(false);
          setPuxando(false);
        }
      }
    }

    carregar();
    return () => {
      cancelado = true;
      pararDeOuvir?.();
    };
  }, [alvo, tentativa]);

  function buscarDeNovo() {
    forcar.current = true;
    setTentativa((t) => t + 1);
  }

  function atualizar() {
    setPuxando(true);
    if (alvo) buscarDeNovo();
    else localizar();
  }

  const fixas = useMemo(
    () => (alvo ? trilhasFixas(alvo.area, alvo.referencia, alvo.raioKm) : []),
    [alvo],
  );
  const todas = useMemo(() => juntarTrilhas(osm ?? [], fixas), [osm, fixas]);

  // Favoritas vêm todas, até as salvas em outro lugar; a distância é recalculada daqui
  const base = useMemo(
    () =>
      soFavoritas
        ? favoritas.map((t) =>
            alvo ? { ...t, distanciaKm: pontoMaisPerto(alvo.referencia, t) } : t,
          )
        : todas,
    [soFavoritas, favoritas, todas, alvo],
  );

  // Só alergias que viram grupo de bicho no iNaturalist entram no risco
  const chaveAlergias = (perfil?.selecionadas ?? [])
    .filter((id) => TAXONS_POR_ALERGIA[id])
    .join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  // Risco de cada trilha da lista, aos poucos; o que já foi calculado não pede de novo
  useEffect(() => {
    setRiscos({});
  }, [chaveAlergias]);
  useEffect(() => {
    let cancelado = false;
    const fila = base.filter((t) => !(t.id in riscos)).slice(0, RISCO_MAX);
    async function trabalhar() {
      while (!cancelado && fila.length > 0) {
        const trilha = fila.shift()!;
        const risco = await calcularRisco(trilha, taxonsAlergia).catch(() => null);
        if (!cancelado) setRiscos((r) => ({ ...r, [trilha.id]: risco }));
      }
    }
    for (let i = 0; i < RISCO_JUNTAS; i++) trabalhar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, taxonsAlergia]);

  const termo = semAcento(busca.trim());
  const naLista = useMemo(
    () =>
      base
        .filter(
          (t) =>
            semAcento(t.nome).includes(termo) &&
            filtros.every((f) => passaNoFiltro(t, f, riscos[t.id])),
        )
        .sort((a, b) => {
          if (ordem === 'curtas') {
            // Sem comprimento conhecido vai pro fim
            return (a.comprimentoKm ?? Infinity) - (b.comprimentoKm ?? Infinity);
          }
          if (ordem === 'seguras') {
            // Risco ainda calculando fica depois dos já calculados
            const ra = riscos[a.id];
            const rb = riscos[b.id];
            const pa = ra ? pesoRisco(ra.nivel) : 9;
            const pb = rb ? pesoRisco(rb.nivel) : 9;
            if (pa !== pb) return pa - pb;
          }
          return a.distanciaKm - b.distanciaKm;
        }),
    [base, termo, ordem, filtros, riscos],
  );

  const referencia = voce ? 'voce' : 'centro';
  const contagem = soFavoritas
    ? `${favoritas.length} ${favoritas.length === 1 ? 'favorita' : 'favoritas'}`
    : `${todas.length} ${todas.length === 1 ? 'trilha' : 'trilhas'}${
        cidade ? '' : ` em ${RAIO_PERTO_KM} km`
      }`;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={estilos.rolagem}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={puxando} onRefresh={atualizar} tintColor={cores.primaria} />
        }>
        <View style={estilos.titulos}>
          <Text style={estilos.marca}>PISA LEVE</Text>
          <Text style={estilos.titulo} accessibilityRole="header">
            Trilhas
          </Text>
          <Text style={estilos.subtitulo}>
            Rotas do OpenStreetMap com os avistamentos ao longo do caminho
          </Text>
        </View>

        <View style={estilos.linhaChips} accessibilityRole="radiogroup">
          <ChipFiltro
            rotulo="Minha localização"
            icone="mira"
            ativo={escolha === 'perto'}
            onPress={() => {
              escolheu.current = true;
              setEscolha('perto');
              if (local.tipo === 'erro') localizar();
            }}
          />
          {cidades === null || cidades.length === 0 ? (
            conferindoCidades || cidades === null ? (
              <View style={estilos.buscandoOsm}>
                <ActivityIndicator color={cores.primaria} size="small" />
                <Text style={estilos.carregandoTexto}>Procurando cidades com trilhas…</Text>
              </View>
            ) : (
              <Text style={estilos.carregandoTexto}>
                Nenhuma cidade vizinha com trilha mapeada.
              </Text>
            )
          ) : (
            cidades.map((c) => (
              <ChipFiltro
                key={c.id}
                rotulo={c.nome}
                icone="pin"
                ativo={escolha === c.id}
                onPress={() => {
                  escolheu.current = true;
                  setEscolha(c.id);
                }}
              />
            ))
          )}
          {conferindoCidades && !!cidades?.length && (
            <ActivityIndicator
              color={cores.primaria}
              size="small"
              accessibilityLabel="Procurando mais cidades com trilhas"
              style={estilos.maisCidades}
            />
          )}
        </View>

        <View style={estilos.busca}>
          <Icone nome="busca" cor={cores.textoSecundario} />
          <TextInput
            value={busca}
            onChangeText={setBusca}
            placeholder="Buscar trilha por nome"
            placeholderTextColor={cores.bordaForte}
            accessibilityLabel="Buscar trilha por nome"
            returnKeyType="search"
            autoCorrect={false}
            style={estilos.buscaCampo}
          />
          {busca.length > 0 && (
            <Pressable
              onPress={() => setBusca('')}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={10}>
              <Icone nome="fechar" cor={cores.textoSecundario} tamanho={18} />
            </Pressable>
          )}
        </View>

        <BarraFiltros campos={CAMPOS} valor={filtros} onChange={setFiltros} />

        <View
          style={estilos.legenda}
          accessibilityLabel="Legenda: risco baixo, médio e alto por trecho">
          {(
            [
              ['Baixo', cores.riscoBaixo],
              ['Médio', cores.riscoMedio],
              ['Alto', cores.riscoAlto],
            ] as const
          ).map(([rotulo, cor]) => (
            <View key={rotulo} style={estilos.legendaItem}>
              <View style={[estilos.legendaCor, { backgroundColor: cor }]} />
              <Text style={estilos.legendaTexto}>{rotulo}</Text>
            </View>
          ))}
          <Text style={[estilos.legendaTexto, estilos.legendaFim]}>Risco por trecho</Text>
        </View>

        {escolha === 'perto' && local.tipo === 'erro' ? (
          <View style={estilos.bloco}>
            <AvisoErro
              titulo="Sem localização"
              mensagem={`${local.mensagem} Enquanto isso, escolha uma cidade acima.`}
            />
            {local.podePedirDeNovo && (
              <Botao
                titulo="Tentar de novo"
                variante="secundario"
                icone="recarregar"
                onPress={localizar}
              />
            )}
          </View>
        ) : !alvo ? (
          <Carregando
            texto={
              local.tipo === 'procurando'
                ? 'Procurando sua localização…'
                : 'Procurando cidades com trilhas…'
            }
          />
        ) : (
          <>
            {falha && !soFavoritas && (
              <View style={estilos.bloco}>
                {falha.tipo === 'fora' && parcial ? (
                  <AvisoErro
                    titulo="A busca completa do OpenStreetMap não respondeu."
                    mensagem="Mostrando a busca rápida, que pode não ter todas as trilhas."
                  />
                ) : falha.tipo === 'fora' ? (
                  <AvisoErro titulo="OpenStreetMap fora do ar no momento." />
                ) : (
                  <AvisoErro
                    titulo="Sem internet"
                    mensagem={`${falha.message}${
                      osm && salvoEm ? ` Mostrando a lista salva ${haQuanto(salvoEm)}.` : ''
                    }`}
                  />
                )}
                <Botao
                  titulo="Tentar de novo"
                  variante="secundario"
                  icone="recarregar"
                  onPress={buscarDeNovo}
                />
              </View>
            )}

            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo} accessibilityRole="header">
                {soFavoritas ? 'Suas favoritas' : cidade ? `Em ${cidade.nome}` : 'Perto de você'}
              </Text>
              <Text style={estilos.contagem}>{contagem}</Text>
            </View>

            {carregando && !puxando && !soFavoritas && (
              <View style={estilos.buscandoOsm} accessibilityLiveRegion="polite">
                <ActivityIndicator color={cores.primaria} size="small" />
                <Text style={estilos.carregandoTexto}>
                  {parcial
                    ? 'Completando a lista pelo OpenStreetMap…'
                    : 'Buscando trilhas no OpenStreetMap…'}
                </Text>
              </View>
            )}

            {naLista.length === 0 ? (
              (soFavoritas || (!carregando && !falha)) && (
                <View style={estilos.vazio}>
                  <Icone nome="montanha" cor={cores.primariaMedia} tamanho={26} />
                  <Text style={estilos.vazioTexto}>
                    {soFavoritas && favoritas.length === 0
                      ? 'Nenhuma trilha favorita ainda. Toque no coração de uma trilha para guardá-la aqui; elas ficam salvas no aparelho e abrem sem internet.'
                      : base.length === 0
                        ? cidade
                          ? `Nenhuma trilha mapeada em ${cidade.nome} ainda.`
                          : `Nenhuma trilha mapeada a até ${RAIO_PERTO_KM} km de você.`
                        : `Nenhuma trilha${soFavoritas ? ' favorita' : ''} com “${busca.trim()}” no nome.`}
                  </Text>
                </View>
              )
            ) : (
              <View style={estilos.lista}>
                {naLista.map((t) => (
                  <CartaoTrilha
                    key={t.id}
                    trilha={t}
                    referencia={referencia}
                    risco={riscos[t.id]}
                    favorita={ehFavorita(t.id)}
                    onAbrir={abrir}
                    onFavoritar={alternar}
                  />
                ))}
              </View>
            )}

            <Text style={estilos.fonte}>
              Fontes: OpenStreetMap e lista do app com trilhas de Juiz de Fora (Tribuna de Minas,
              UFJF e Prefeitura).
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Fora do componente para o memo do cartão funcionar
function abrir(t: Trilha) {
  lembrarTrilha(t);
  router.push({ pathname: '/trilha/[id]', params: { id: t.id } });
}

function haQuanto(quando: number) {
  const minutos = Math.round((Date.now() - quando) / 60_000);
  if (minutos < 1) return 'de agora há pouco';
  if (minutos < 60) return `de ${minutos} min atrás`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `de ${horas} h atrás`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? 'de ontem' : `de ${dias} dias atrás`;
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
  rolagem: {
    paddingHorizontal: espacos.xl,
    paddingTop: espacos.md,
    paddingBottom: espacos.xxl,
    gap: 14,
  },
  busca: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    paddingHorizontal: 14,
    borderRadius: raios.campo,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  buscaCampo: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    fontFamily: fontes.regular,
    fontSize: 15,
    color: cores.texto,
  },
  maisCidades: {
    alignSelf: 'center',
    marginLeft: espacos.xs,
  },
  legenda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendaCor: {
    width: 18,
    height: 5,
    borderRadius: 3,
  },
  legendaTexto: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  legendaFim: {
    marginLeft: 'auto',
  },
  linhaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
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
  buscandoOsm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.sm,
  },
  lista: {
    gap: 10,
  },
  carregando: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacos.sm,
    paddingVertical: 40,
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
  fonte: {
    fontFamily: fontes.regular,
    fontSize: 11,
    lineHeight: 16,
    color: cores.textoSecundario,
  },
});
