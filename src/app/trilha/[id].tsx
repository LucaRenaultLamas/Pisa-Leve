import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line } from 'react-native-svg';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { ETIQUETA, textoRegistros } from '@/components/CartaoTrilha';
import { Icone } from '@/components/Icone';
import { MapaTrilha } from '@/components/MapaTrilha';
import { COR_RISCO } from '@/components/MiniTrilha';
import { corDoRegistro, TRACEJADO } from '@/components/mapaTrilha.comum';
import { TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useFavoritas } from '@/contexts/favoritas';
import { useSessao } from '@/contexts/sessao';
import {
  ANOS_RECENTES,
  calcularRisco,
  PERTO_DA_TRILHA_KM,
  RAIO_SO_INICIO_KM,
  type NivelRisco,
  type RegistroRisco,
  type RiscoTrilha,
} from '@/services/risco';
import { acharTrilha, type Trilha } from '@/services/trilhas';
import { formatarDistancia, tempoAtras } from '@/utils/geo';

const NA_LISTA = 15; // registros antes do "Mostrar todos"

const LEGENDA: { nivel: NivelRisco; texto: string }[] = [
  { nivel: 'baixo', texto: 'Sem registros de risco' },
  { nivel: 'medio', texto: 'Bichos ligados às suas alergias' },
  { nivel: 'alto', texto: 'Animais peçonhentos' },
];

export default function TrilhaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { perfil } = useSessao();
  const { favoritas, ehFavorita, alternar } = useFavoritas();
  const podeVoltar = useCanGoBack();

  // undefined = procurando; null = não achou
  const [trilha, setTrilha] = useState<Trilha | null | undefined>(undefined);
  const [risco, setRisco] = useState<RiscoTrilha | null | undefined>(undefined);
  const [tentativa, setTentativa] = useState(0); // muda pra calcular de novo
  const [todos, setTodos] = useState(false);

  // Favorita vem do aparelho; as outras, da lista que abriu a tela ou das listas salvas
  useEffect(() => {
    if (trilha) return;
    const favorita = favoritas.find((t) => t.id === id);
    if (favorita) {
      setTrilha(favorita);
      return;
    }
    let cancelado = false;
    acharTrilha(id).then((achada) => {
      if (!cancelado) setTrilha((atual) => atual ?? achada);
    });
    return () => {
      cancelado = true;
    };
  }, [id, favoritas, trilha]);

  const chaveAlergias = (perfil?.selecionadas ?? [])
    .filter((alergia) => TAXONS_POR_ALERGIA[alergia])
    .join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  useEffect(() => {
    if (!trilha) return;
    let cancelado = false;
    setRisco(undefined);
    calcularRisco(trilha, taxonsAlergia)
      .then((r) => !cancelado && setRisco(r))
      .catch(() => !cancelado && setRisco(null));
    return () => {
      cancelado = true;
    };
  }, [trilha, taxonsAlergia, tentativa]);

  function voltar() {
    if (podeVoltar) router.back();
    else router.replace('/trilhas');
  }

  function abrirRegistro(r: RegistroRisco) {
    router.push({
      pathname: '/animal/[id]',
      params: { id: String(r.taxonId), avistamento: String(r.id) },
    });
  }

  if (trilha === undefined || trilha === null) {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
        <View style={estilos.barraTopo}>
          <BotaoRedondo icone="voltar" rotulo="Voltar" onPress={voltar} />
        </View>
        <View style={estilos.centro}>
          {trilha === undefined ? (
            <ActivityIndicator color={cores.primaria} />
          ) : (
            <>
              <AvisoErro
                titulo="Trilha não encontrada"
                mensagem="Ela não está mais na lista salva no aparelho. Abra de novo pela aba Trilhas."
              />
              <Botao titulo="Ir para Trilhas" variante="secundario" onPress={voltar} />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const favorita = ehFavorita(trilha.id);
  const semDesenho = trilha.trechos.length === 0;
  const etiqueta = risco ? ETIQUETA[risco.nivel] : null;
  const tamanho =
    trilha.comprimentoKm !== null
      ? formatarDistancia(trilha.comprimentoKm)
      : trilha.rotaLonga
        ? 'Rota longa'
        : null;
  const detalhe = [tamanho, trilha.origem === 'osm' ? 'OpenStreetMap' : 'Lista de Juiz de Fora']
    .filter(Boolean)
    .join(' · ');
  const totalTrechos = risco?.trechos.length ?? 0;
  const registros = risco?.registros ?? [];
  const naLista = todos ? registros : registros.slice(0, NA_LISTA);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.rolagem}>
        <View style={estilos.barraTopo}>
          <BotaoRedondo icone="voltar" rotulo="Voltar" onPress={voltar} />
          <BotaoRedondo
            icone={favorita ? 'coracaoCheio' : 'coracao'}
            cor={favorita ? cores.erro : cores.primaria}
            rotulo={favorita ? 'Tirar das favoritas' : 'Favoritar trilha'}
            selecionado={favorita}
            onPress={() => alternar(trilha)}
          />
        </View>

        <View style={estilos.titulos}>
          <Text style={estilos.marca}>TRILHA</Text>
          <Text style={estilos.titulo} accessibilityRole="header">
            {trilha.nome}
          </Text>
          <Text style={estilos.subtitulo}>{detalhe}</Text>
        </View>

        <View style={estilos.resumo}>
          {risco === undefined ? (
            <View style={estilos.linha}>
              <ActivityIndicator size="small" color={cores.textoSecundario} />
              <Text style={estilos.resumoTexto}>Calculando o risco de cada trecho…</Text>
            </View>
          ) : risco && etiqueta ? (
            <>
              <View style={[estilos.etiqueta, { backgroundColor: etiqueta.fundo }]}>
                <Icone nome={etiqueta.icone} cor={etiqueta.cor} tamanho={14} />
                <Text style={[estilos.etiquetaTexto, { color: etiqueta.cor }]}>
                  {etiqueta.texto}
                </Text>
              </View>
              <Text style={estilos.resumoTexto}>{textoRegistros(risco)}</Text>
            </>
          ) : null}
        </View>

        {risco === null && (
          <View style={estilos.bloco}>
            <AvisoErro
              titulo="Não deu para calcular o risco"
              mensagem="O iNaturalist não respondeu. O caminho aparece em cinza até dar certo."
            />
            <Botao
              titulo="Tentar de novo"
              variante="secundario"
              icone="recarregar"
              onPress={() => setTentativa((t) => t + 1)}
            />
          </View>
        )}

        <View style={estilos.mapa}>
          <MapaTrilha
            trilha={trilha}
            risco={risco}
            raioSemDesenhoKm={RAIO_SO_INICIO_KM}
            onAbrirRegistro={abrirRegistro}
          />
          {risco === undefined && (
            <View style={estilos.selo} pointerEvents="none">
              <ActivityIndicator size="small" color={cores.primaria} />
              <Text style={estilos.seloTexto}>Calculando risco…</Text>
            </View>
          )}
        </View>

        <View style={estilos.legenda} accessibilityRole="list" accessibilityLabel="Legenda do mapa">
          {LEGENDA.map(({ nivel, texto }) => (
            <View key={nivel} style={estilos.linha}>
              <Svg width={34} height={8} aria-hidden>
                <Line
                  x1={2}
                  y1={4}
                  x2={32}
                  y2={4}
                  stroke={COR_RISCO[nivel]}
                  strokeWidth={5}
                  strokeDasharray={TRACEJADO.join(' ')}
                />
              </Svg>
              <Text style={estilos.legendaTexto}>{texto}</Text>
            </View>
          ))}
          <View style={estilos.linha}>
            <View style={estilos.inicioLegenda} aria-hidden />
            <Text style={estilos.legendaTexto}>Início da trilha</Text>
          </View>
          {taxonsAlergia.length === 0 && (
            <Text style={estilos.nota}>
              Seu perfil não tem alergia ligada a animais, então o amarelo não aparece. Dá pra
              marcar em Perfil › Alergias.
            </Text>
          )}
          {semDesenho && (
            <Text style={estilos.nota}>
              O caminho desta trilha não está desenhado no OpenStreetMap. O círculo mostra os{' '}
              {formatarDistancia(RAIO_SO_INICIO_KM)} em volta do início, que é a área usada no
              risco.
            </Text>
          )}
        </View>

        {(trilha.de || trilha.para || trilha.descricao) && (
          <View style={estilos.cartao}>
            <Text style={estilos.secaoTitulo} accessibilityRole="header">
              Sobre a trilha
            </Text>
            {(trilha.de || trilha.para) && (
              <Text style={estilos.texto}>
                {trilha.de ?? '?'} → {trilha.para ?? '?'}
              </Text>
            )}
            {!!trilha.descricao && <Text style={estilos.texto}>{trilha.descricao}</Text>}
            {trilha.rotaLonga && (
              <Text style={estilos.nota}>
                Rota longa: só aparece o pedaço perto da área buscada.
              </Text>
            )}
          </View>
        )}

        {risco && (
          <View style={estilos.bloco}>
            <Text style={estilos.secaoTitulo} accessibilityRole="header">
              Registrado {semDesenho ? 'perto do início' : 'perto da trilha'}
            </Text>
            {registros.length === 0 ? (
              <View style={estilos.vazio}>
                <Icone nome="escudo" cor={COR_RISCO.baixo} tamanho={26} />
                <Text style={estilos.vazioTexto}>
                  Nenhum peçonhento{taxonsAlergia.length > 0 ? ' nem bicho das suas alergias' : ''}{' '}
                  registrado aqui nos últimos {ANOS_RECENTES} anos.
                </Text>
              </View>
            ) : (
              <View style={estilos.lista}>
                {naLista.map((r, i) => (
                  <Pressable
                    key={r.id}
                    onPress={() => abrirRegistro(r)}
                    accessibilityRole="link"
                    accessibilityLabel={`${r.nome}, ${r.peconhento ? 'peçonhento' : 'ligado à sua alergia'}, ${onde(r, totalTrechos)}, ${tempoAtras(r.data)}`}
                    style={({ pressed }) => [
                      estilos.item,
                      i > 0 && estilos.itemDivisor,
                      pressed && { opacity: 0.7 },
                    ]}>
                    <View style={[estilos.bolinha, { backgroundColor: corDoRegistro(r) }]} />
                    <View style={estilos.itemTextos}>
                      <Text style={estilos.itemNome} numberOfLines={1}>
                        {r.nome}
                      </Text>
                      <Text style={estilos.itemDetalhe} numberOfLines={1}>
                        {r.peconhento ? 'Peçonhento' : 'Sua alergia'} · {onde(r, totalTrechos)} ·{' '}
                        {tempoAtras(r.data)}
                      </Text>
                    </View>
                    <Icone nome="avancar" cor={cores.textoSecundario} tamanho={18} />
                  </Pressable>
                ))}
              </View>
            )}
            {registros.length > NA_LISTA && (
              <Pressable
                onPress={() => setTodos((t) => !t)}
                accessibilityRole="button"
                hitSlop={8}
                style={estilos.mostrar}>
                <Text style={estilos.link}>
                  {todos ? 'Mostrar menos' : `Mostrar todos (${registros.length})`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        <Text style={estilos.fonte}>
          Fontes: iNaturalist (observações confirmadas dos últimos {ANOS_RECENTES} anos, até{' '}
          {formatarDistancia(PERTO_DA_TRILHA_KM)} da trilha) e OpenStreetMap. Cada trecho tem cerca
          de 500 m.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function onde(r: RegistroRisco, totalTrechos: number) {
  if (r.trecho === null) return 'perto do início';
  return `trecho ${r.trecho + 1} de ${totalTrechos}`;
}

function BotaoRedondo({
  icone,
  rotulo,
  onPress,
  cor = cores.primaria,
  selecionado,
}: {
  icone: 'voltar' | 'coracao' | 'coracaoCheio';
  rotulo: string;
  onPress: () => void;
  cor?: string;
  selecionado?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      accessibilityState={selecionado === undefined ? undefined : { selected: selecionado }}
      hitSlop={4}
      style={({ pressed }) => [estilos.botaoRedondo, pressed && { opacity: 0.7 }]}>
      <Icone nome={icone} cor={cor} tamanho={22} />
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
    gap: 14,
  },
  barraTopo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
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
  centro: {
    flex: 1,
    justifyContent: 'center',
    gap: espacos.md,
    padding: espacos.xl,
  },
  titulos: {
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
  resumo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
    minHeight: 26,
  },
  resumoTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  etiquetaTexto: {
    fontFamily: fontes.negrito,
    fontSize: 12,
  },
  bloco: {
    gap: espacos.md,
  },
  mapa: {
    height: 340,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.mapaFundo,
  },
  selo: {
    position: 'absolute',
    left: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  legenda: {
    gap: 8,
    padding: 14,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  legendaTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.texto,
  },
  inicioLegenda: {
    width: 14,
    height: 14,
    marginHorizontal: 10,
    borderRadius: 7,
    borderWidth: 2.5,
    borderColor: cores.superficie,
    backgroundColor: cores.primaria,
    boxShadow: '0 0 0 1px rgba(20, 38, 28, 0.2)',
  },
  nota: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSecundario,
  },
  cartao: {
    gap: 6,
    padding: 14,
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  secaoTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  texto: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 20,
    color: cores.texto,
  },
  lista: {
    borderRadius: raios.campo,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  itemDivisor: {
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  bolinha: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  itemTextos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  itemNome: {
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.texto,
  },
  itemDetalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  mostrar: {
    alignSelf: 'center',
    paddingVertical: 4,
  },
  link: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
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
