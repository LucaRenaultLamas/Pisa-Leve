import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
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
import { Carregando } from '@/components/Carregando';
import { CartaoAnimal } from '@/components/CartaoAnimal';
import { ChipFiltro } from '@/components/ChipFiltro';
import { Icone } from '@/components/Icone';
import { ligadoAAlergia, PINS, TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { perigoDe } from '@/constants/perigos';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import {
  animaisDeCuidado,
  guardarBuscaRecente,
  lerBuscasRecentes,
  limparBuscasRecentes,
  procurarAnimais,
  RAIO_PERTO_KM,
  type AnimalBusca,
} from '@/services/buscaAnimais';
import { ErroApi } from '@/services/inaturalist';
import { pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';

const MIN_LETRAS = 2;
const ESPERA_DIGITACAO_MS = 400;

const ORDENS = [
  { id: 'vistos', rotulo: 'Mais vistos' },
  { id: 'perigo', rotulo: 'Perigo primeiro' },
  { id: 'nome', rotulo: 'Nome (A–Z)' },
];

function camposDeFiltro(temAlergia: boolean): CampoFiltro[] {
  return [
    {
      id: 'ordem',
      rotulo: 'Ordenar',
      icone: 'ordenar',
      fixo: true,
      operadores: [{ valor: 'por', rotulo: 'por' }],
      opcoes: ORDENS.map((o) => ({ valor: o.id, rotulo: o.rotulo })),
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
        { valor: 'inseto', rotulo: 'Insetos', cor: '#5C6B1F' },
        { valor: 'outro', rotulo: 'Outros', cor: PINS.outro.cor },
      ],
    },
    {
      id: 'perigo',
      rotulo: 'Perigo',
      icone: 'perigo',
      operadores: [
        { valor: 'qualquer', rotulo: 'é um destes', varios: true },
        { valor: 'nenhum', rotulo: 'nenhum destes', varios: true },
      ],
      opcoes: [
        { valor: 'grave', rotulo: 'Peçonhento', cor: cores.perigoTexto },
        { valor: 'cuidado', rotulo: 'Pica, ferroa ou queima', cor: cores.riscoMedio },
        { valor: 'sem', rotulo: 'Sem perigo conhecido', cor: cores.riscoBaixo },
        ...(temAlergia ? [{ valor: 'alergia', rotulo: 'Sua alergia', cor: PINS.alergia.cor }] : []),
      ],
    },
  ];
}

const FILTROS_INICIAIS: FiltroAplicado[] = [
  { id: 'ordem', campo: 'ordem', operador: 'por', valores: ['vistos'] },
];

type Item = { animal: AnimalBusca; alergia: boolean; nivel: 'grave' | 'cuidado' | 'sem' };

function passaNoFiltro(item: Item, f: FiltroAplicado) {
  if (f.valores.length === 0) return true;
  if (f.campo === 'grupo') {
    const tem = f.valores.includes(item.animal.grupo);
    return f.operador === 'nao_e' ? !tem : tem;
  }
  if (f.campo === 'perigo') {
    const tem = f.valores.some((v) => (v === 'alergia' ? item.alergia : v === item.nivel));
    return f.operador === 'nenhum' ? !tem : tem;
  }
  return true;
}

// Grave, depois sua alergia, depois o que pica/ferroa; empate vai pelos registros
function pesoPerigo(item: Item) {
  if (item.nivel === 'grave') return 0;
  if (item.alergia) return 1;
  return item.nivel === 'cuidado' ? 2 : 3;
}

function ordenar(itens: Item[], ordem: string) {
  const copia = [...itens];
  if (ordem === 'nome')
    return copia.sort((a, b) => a.animal.nome.localeCompare(b.animal.nome, 'pt-BR'));
  if (ordem === 'perigo') {
    return copia.sort(
      (a, b) => pesoPerigo(a) - pesoPerigo(b) || b.animal.registros - a.animal.registros,
    );
  }
  return copia.sort((a, b) => b.animal.registros - a.animal.registros);
}

function registros(n: number) {
  return `${n.toLocaleString('pt-BR')} ${n === 1 ? 'registro' : 'registros'}`;
}

type Estado =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; animais: AnimalBusca[] };

export default function Busca() {
  const { perfil, usuario } = useSessao();

  const [texto, setTexto] = useState('');
  const [termo, setTermo] = useState(''); // o texto depois da pausa na digitação
  const [filtros, setFiltros] = useState<FiltroAplicado[]>(FILTROS_INICIAIS);
  const [recentes, setRecentes] = useState<string[]>([]);

  // undefined = ainda procurando; null = sem localização (mostra o Brasil)
  const [centro, setCentro] = useState<Coordenadas | null | undefined>(undefined);
  const [perto, setPerto] = useState<Estado>({ tipo: 'carregando' });
  const [resultado, setResultado] = useState<Estado>({ tipo: 'carregando' });
  const [tentativa, setTentativa] = useState(0);

  const alergiasComBicho = (perfil?.selecionadas ?? []).filter((id) => TAXONS_POR_ALERGIA[id]);
  const chaveAlergias = alergiasComBicho.join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  function localizar() {
    setCentro(undefined);
    pegarLocalizacaoAtual()
      .then(setCentro)
      .catch(() => setCentro(null));
  }

  useEffect(() => {
    localizar();
  }, []);

  const nomeUsuario = usuario?.usuario;
  useEffect(() => {
    if (!nomeUsuario) return;
    lerBuscasRecentes(nomeUsuario)
      .then(setRecentes)
      .catch(() => setRecentes([]));
  }, [nomeUsuario]);

  useEffect(() => {
    const limpo = texto.trim();
    const relogio = setTimeout(() => setTermo(limpo), ESPERA_DIGITACAO_MS);
    return () => clearTimeout(relogio);
  }, [texto]);

  const buscando = termo.length >= MIN_LETRAS;

  // Lista "pedem cuidado": só depois de saber se tem localização
  useEffect(() => {
    if (centro === undefined) return;
    let cancelado = false;
    setPerto({ tipo: 'carregando' });
    animaisDeCuidado(centro, taxonsAlergia)
      .then((animais) => !cancelado && setPerto({ tipo: 'pronto', animais }))
      .catch(
        (e) =>
          !cancelado &&
          setPerto({
            tipo: 'erro',
            mensagem: e instanceof ErroApi ? e.message : 'Algo deu errado ao buscar os animais.',
          }),
      );
    return () => {
      cancelado = true;
    };
  }, [centro, taxonsAlergia, tentativa]);

  useEffect(() => {
    if (!buscando) return;
    let cancelado = false; // resposta velha não sobrescreve a nova
    setResultado({ tipo: 'carregando' });
    procurarAnimais(termo)
      .then((animais) => !cancelado && setResultado({ tipo: 'pronto', animais }))
      .catch(
        (e) =>
          !cancelado &&
          setResultado({
            tipo: 'erro',
            mensagem: e instanceof ErroApi ? e.message : 'Algo deu errado na busca.',
          }),
      );
    return () => {
      cancelado = true;
    };
  }, [termo, buscando, tentativa]);

  async function lembrar(termoUsado: string) {
    if (!nomeUsuario || termoUsado.length < MIN_LETRAS) return;
    try {
      setRecentes(await guardarBuscaRecente(nomeUsuario, termoUsado));
    } catch {
      // Lembrar a busca é extra: se falhar, segue
    }
  }

  function abrir(animal: AnimalBusca) {
    if (buscando) lembrar(termo);
    router.push({ pathname: '/animal/[id]', params: { id: String(animal.id) } });
  }

  async function apagarRecentes() {
    if (!nomeUsuario) return;
    setRecentes([]);
    await limparBuscasRecentes(nomeUsuario).catch(() => {});
  }

  const estado = buscando ? resultado : perto;
  const ordem = filtros.find((f) => f.campo === 'ordem')?.valores[0] ?? 'vistos';
  const filtrando = filtros.some((f) => f.campo !== 'ordem' && f.valores.length > 0);
  const campos = camposDeFiltro(taxonsAlergia.length > 0);

  const itens = useMemo(() => {
    if (estado.tipo !== 'pronto') return [];
    const todos = estado.animais.map((animal): Item => ({
      animal,
      alergia: ligadoAAlergia(animal.ancestrais, taxonsAlergia),
      nivel: perigoDe(animal.ancestrais)?.nivel ?? 'sem',
    }));
    return ordenar(
      todos.filter((i) => filtros.every((f) => passaNoFiltro(i, f))),
      ordem,
    );
  }, [estado, taxonsAlergia, filtros, ordem]);

  const ondePerto = centro ? 'perto de você' : 'no Brasil';
  const detalheDe = (a: AnimalBusca) =>
    buscando
      ? `${registros(a.registros)} no iNaturalist`
      : `${registros(a.registros)} ${ondePerto}`;

  function limparFiltros() {
    setFiltros((fs) => fs.filter((f) => f.campo === 'ordem'));
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
        <View style={estilos.titulos}>
          <Text style={estilos.marca}>PISA LEVE</Text>
          <Text style={estilos.titulo} accessibilityRole="header">
            Buscar animais
          </Text>
          <Text style={estilos.subtitulo}>Descubra o que é perigoso e como se proteger</Text>
        </View>

        <View style={estilos.busca}>
          <Icone nome="busca" cor={cores.textoSecundario} />
          <TextInput
            value={texto}
            onChangeText={setTexto}
            onSubmitEditing={() => {
              const limpo = texto.trim();
              setTermo(limpo);
              lembrar(limpo);
            }}
            placeholder="Nome popular ou científico"
            placeholderTextColor={cores.bordaForte}
            accessibilityLabel="Buscar animal por nome popular ou científico"
            returnKeyType="search"
            autoCorrect={false}
            style={estilos.buscaCampo}
          />
          {texto.length > 0 && (
            <Pressable
              onPress={() => {
                setTexto('');
                setTermo('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              hitSlop={10}>
              <Icone nome="fechar" cor={cores.textoSecundario} tamanho={18} />
            </Pressable>
          )}
        </View>

        <BarraFiltros campos={campos} valor={filtros} onChange={setFiltros} />

        {!buscando && recentes.length > 0 && (
          <View style={estilos.bloco}>
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo}>Buscas recentes</Text>
              <Pressable onPress={apagarRecentes} accessibilityRole="button" hitSlop={8}>
                <Text style={estilos.link}>Limpar</Text>
              </Pressable>
            </View>
            <View style={estilos.linhaChips}>
              {recentes.map((r) => (
                <ChipFiltro
                  key={r}
                  rotulo={r}
                  rotuloAcessivel={`Buscar de novo: ${r}`}
                  icone="relogio"
                  ativo={false}
                  onPress={() => {
                    setTexto(r);
                    setTermo(r);
                  }}
                />
              ))}
            </View>
          </View>
        )}

        {texto.trim().length > 0 && texto.trim().length < MIN_LETRAS ? (
          <Text style={estilos.dica}>Digite pelo menos {MIN_LETRAS} letras.</Text>
        ) : (
          <View style={estilos.bloco}>
            <View style={estilos.secao}>
              <Text style={estilos.secaoTitulo} accessibilityRole="header">
                {buscando ? `Resultados para “${termo}”` : `Pedem cuidado ${ondePerto}`}
              </Text>
              {estado.tipo === 'pronto' && (
                <Text style={estilos.contagem}>
                  {itens.length} {itens.length === 1 ? 'animal' : 'animais'}
                </Text>
              )}
            </View>
            {!buscando && (
              <Text style={estilos.explicacao}>
                {centro
                  ? `Os mais registrados a até ${RAIO_PERTO_KM} km, entre os que picam, mordem, ferroam ou ligados às suas alergias.`
                  : centro === null
                    ? 'Sem sua localização: mostrando os mais registrados no Brasil. '
                    : 'Procurando sua localização…'}
                {centro === null && (
                  <Text style={estilos.link} onPress={localizar} accessibilityRole="button">
                    Usar minha localização
                  </Text>
                )}
              </Text>
            )}

            {estado.tipo === 'carregando' || (!buscando && centro === undefined) ? (
              <View
                style={estilos.carregando}
                accessibilityRole="progressbar"
                accessibilityLabel="Carregando animais">
                <Carregando />
                <Text style={estilos.carregandoTexto}>
                  {buscando ? `Buscando “${termo}”…` : 'Carregando animais…'}
                </Text>
              </View>
            ) : estado.tipo === 'erro' ? (
              <View style={estilos.bloco}>
                <AvisoErro titulo="Não deu para buscar os animais" mensagem={estado.mensagem} />
                <Botao
                  titulo="Tentar de novo"
                  variante="secundario"
                  icone="recarregar"
                  onPress={() => setTentativa((t) => t + 1)}
                />
              </View>
            ) : itens.length === 0 ? (
              <View style={estilos.vazio}>
                <Icone nome="busca" cor={cores.textoSecundario} tamanho={26} />
                <Text style={estilos.vazioTexto}>
                  {buscando
                    ? `Nenhum animal encontrado para “${termo}”${filtrando ? ' com esses filtros' : ''}.`
                    : `Nenhum animal ${filtrando ? 'com esses filtros ' : ''}registrado ${ondePerto}.`}
                </Text>
                {filtrando && (
                  <Botao titulo="Limpar filtros" variante="secundario" onPress={limparFiltros} />
                )}
              </View>
            ) : (
              <View style={estilos.lista}>
                {itens.map((i) => (
                  <CartaoAnimal
                    key={i.animal.id}
                    animal={i.animal}
                    alergia={i.alergia}
                    detalhe={detalheDe(i.animal)}
                    onPress={abrir}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={estilos.fonte}>
          Fonte: iNaturalist. Perto de você contam só registros confirmados pela comunidade.
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
    gap: 14,
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
  bloco: {
    gap: espacos.md,
  },
  secao: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: espacos.sm,
  },
  secaoTitulo: {
    flex: 1,
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  contagem: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  link: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  linhaChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  explicacao: {
    marginTop: -6,
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSecundario,
  },
  dica: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
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
