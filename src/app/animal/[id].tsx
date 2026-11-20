import { router, useCanGoBack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { Icone, type NomeIcone } from '@/components/Icone';
import { PopupFoto } from '@/components/PopupFoto';
import { gruposDeAlergias } from '@/constants/alergias';
import { ehPeconhento, ligadoAAlergia, TAXONS_POR_ALERGIA } from '@/constants/animais';
import { perigoDe } from '@/constants/perigos';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';
import { guardarAnimaisSalvos, lerAnimaisSalvos, type AnimalSalvo } from '@/services/animaisSalvos';
import {
  buscarAnimal,
  buscarDetalheAvistamento,
  ErroApi,
  type Animal,
  type DetalheAvistamento,
} from '@/services/inaturalist';
import { pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';
import { distanciaKm, formatarDistancia } from '@/utils/geo';

// Altura fixa: na web, seguir a largura deixava a foto grande demais
const ALTURA_FOTO = 260;

const rotuloPorId = new Map(
  gruposDeAlergias.flatMap((g) => g.itens).map((item) => [item.id, item.rotulo]),
);

const avisoAlergia = (alergias: string) =>
  `Você marcou alergia a ${alergias}: se tiver falta de ar, inchaço no rosto ou na garganta ou tontura, ligue 192 na hora.`;

const CUIDADOS_SO_ALERGIA = [
  'Mantenha distância e não mexa em ninhos ou colmeias.',
  'Se o seu médico receitou adrenalina autoinjetável, leve sempre e use como ele orientou.',
];

function formatarData(data: string) {
  const [ano, mes, dia] = data.slice(0, 10).split('-');
  return `${dia}/${mes}/${ano}`;
}

export default function AnimalDetalhe() {
  const { id, avistamento } = useLocalSearchParams<{ id: string; avistamento?: string }>();
  const { perfil, usuario } = useSessao();
  const podeVoltar = useCanGoBack();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [detalhe, setDetalhe] = useState<DetalheAvistamento | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [erroAvistamento, setErroAvistamento] = useState(false);
  const [tentativa, setTentativa] = useState(0);
  const [voce, setVoce] = useState<Coordenadas | null>(null);
  const [salvos, setSalvos] = useState<AnimalSalvo[]>([]);
  const [larguraFoto, setLarguraFoto] = useState(0);
  const [fotoAtual, setFotoAtual] = useState(0);
  const [fotoAberta, setFotoAberta] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);
    setErroAvistamento(false);
    // O avistamento é extra: se falhar, a página do animal aparece mesmo assim
    const pedidoAvistamento = avistamento
      ? buscarDetalheAvistamento(Number(avistamento)).catch(() => {
          if (!cancelado) setErroAvistamento(true);
          return null;
        })
      : Promise.resolve(null);

    Promise.all([buscarAnimal(Number(id)), pedidoAvistamento])
      .then(([a, d]) => {
        if (cancelado) return;
        setAnimal(a);
        setDetalhe(d);
      })
      .catch((e) => {
        if (!cancelado) {
          setErro(e instanceof ErroApi ? e.message : 'Não deu para carregar esse animal.');
        }
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [id, avistamento, tentativa]);

  // Distância é enfeite: sem localização, a linha sai sem ela
  useEffect(() => {
    pegarLocalizacaoAtual()
      .then(setVoce)
      .catch(() => {});
  }, []);

  const nomeUsuario = usuario?.usuario ?? null;
  useEffect(() => {
    if (!nomeUsuario) return;
    lerAnimaisSalvos(nomeUsuario)
      .then(setSalvos)
      .catch(() => {});
  }, [nomeUsuario]);

  function voltar() {
    if (podeVoltar) router.back();
    else router.replace('/');
  }

  const salvo = salvos.some((s) => s.taxonId === Number(id));

  function alternarSalvo() {
    if (!animal || !nomeUsuario) return;
    const novos = salvo
      ? salvos.filter((s) => s.taxonId !== animal.id)
      : [
          {
            taxonId: animal.id,
            nome: animal.nome,
            nomeCientifico: animal.nomeCientifico,
            foto: animal.foto,
            peconhento: ehPeconhento(animal.ancestrais),
            salvoEm: Date.now(),
          },
          ...salvos,
        ];
    setSalvos(novos);
    // A tela muda na hora; salvar no aparelho vai por trás
    guardarAnimaisSalvos(nomeUsuario, novos).catch(() => {});
  }

  const cabecalho = (
    <View style={estilos.cabecalho}>
      <Pressable
        onPress={voltar}
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        hitSlop={10}
        style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.6 }]}>
        <Icone nome="voltar" cor={cores.primaria} tamanho={26} />
      </Pressable>
      <Text style={estilos.cabecalhoTitulo} accessibilityRole="header">
        Detalhes
      </Text>
      {animal && (
        <Pressable
          onPress={alternarSalvo}
          accessibilityRole="button"
          accessibilityState={{ selected: salvo }}
          accessibilityLabel={salvo ? `Tirar ${animal.nome} dos salvos` : `Salvar ${animal.nome}`}
          hitSlop={4}
          style={({ pressed }) => [estilos.coracao, pressed && { opacity: 0.7 }]}>
          <Icone
            nome={salvo ? 'coracaoCheio' : 'coracao'}
            cor={salvo ? cores.erro : cores.primaria}
            tamanho={24}
          />
        </Pressable>
      )}
    </View>
  );

  if (carregando || erro || !animal) {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
        <View style={estilos.rolagem}>{cabecalho}</View>
        <View style={estilos.centro}>
          {carregando ? (
            <View
              style={estilos.linhaCarregando}
              accessibilityRole="progressbar"
              accessibilityLabel="Carregando o animal">
              <ActivityIndicator color={cores.primaria} />
              <Text style={estilos.rotulo}>Carregando informações do animal…</Text>
            </View>
          ) : (
            <>
              <AvisoErro titulo="Não deu para abrir esse animal" mensagem={erro ?? undefined} />
              <Botao
                titulo="Tentar de novo"
                variante="secundario"
                icone="recarregar"
                onPress={() => setTentativa((t) => t + 1)}
              />
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const perigo = perigoDe(animal.ancestrais);
  const minhasAlergias = (perfil?.selecionadas ?? []).filter((alergia) =>
    ligadoAAlergia(animal.ancestrais, TAXONS_POR_ALERGIA[alergia] ?? []),
  );
  const nomesAlergias = minhasAlergias.map((a) => rotuloPorId.get(a) ?? a).join(', ');
  const fotos =
    detalhe && detalhe.fotos.length > 0 ? detalhe.fotos : animal.foto ? [animal.foto] : [];
  const credito = detalhe && detalhe.fotos.length > 0 ? detalhe.creditoFoto : animal.creditoFoto;

  const distancia = voce && detalhe?.coordenadas ? distanciaKm(voce, detalhe.coordenadas) : null;
  const localizacao = [
    detalhe?.lugar,
    distancia !== null && `${formatarDistancia(distancia)} de você`,
  ]
    .filter(Boolean)
    .join(' · ');

  // Qualquer perigo (ou alergia sua) ganha as orientações e o botão do SAMU
  const alergia = minhasAlergias.length > 0 ? [avisoAlergia(nomesAlergias)] : [];
  const cuidados = perigo
    ? [...alergia, ...perigo.cuidados]
    : alergia.length > 0
      ? [...alergia, ...CUIDADOS_SO_ALERGIA]
      : null;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.rolagem}>
        {cabecalho}

        <View>
          <View style={estilos.foto} onLayout={(e) => setLarguraFoto(e.nativeEvent.layout.width)}>
            {fotos.length === 0 ? (
              <View style={estilos.semFoto}>
                <Icone nome="foto" cor={cores.primaria} tamanho={36} />
                <Text style={estilos.semFotoTexto}>Foto iNaturalist</Text>
              </View>
            ) : (
              larguraFoto > 0 && (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) =>
                    setFotoAtual(Math.round(e.nativeEvent.contentOffset.x / larguraFoto))
                  }
                  scrollEventThrottle={100}>
                  {fotos.map((url, i) => (
                    <Pressable
                      key={url}
                      onPress={() => setFotoAberta(true)}
                      accessibilityRole="imagebutton"
                      accessibilityLabel={`Foto ${i + 1} de ${fotos.length} de ${animal.nome}`}
                      accessibilityHint="Abre a foto em tela cheia">
                      <Image
                        source={{ uri: url }}
                        style={{ width: larguraFoto, height: ALTURA_FOTO }}
                        resizeMode="cover"
                      />
                    </Pressable>
                  ))}
                </ScrollView>
              )
            )}
            {fotos.length > 1 && (
              <View style={estilos.contadorFoto} pointerEvents="none">
                <Text style={estilos.contadorTexto}>
                  {fotoAtual + 1}/{fotos.length}
                </Text>
              </View>
            )}
          </View>
          {/* As fotos do iNaturalist são CC BY-NC: o crédito é obrigatório */}
          {!!credito && <Text style={estilos.credito}>Foto: {credito}</Text>}
        </View>

        {(perigo || minhasAlergias.length > 0 || detalhe?.confirmado) && (
          <View style={estilos.selos}>
            {perigo && (
              <Selo
                icone="perigo"
                texto={perigo.selo}
                fundo={perigo.nivel === 'grave' ? cores.perigoFundo : cores.avisoFundo}
                cor={perigo.nivel === 'grave' ? cores.perigoTexto : cores.avisoTexto}
              />
            )}
            {minhasAlergias.length > 0 && (
              <Selo
                icone="alerta"
                texto="Sua alergia"
                fundo={cores.avisoFundo}
                cor={cores.avisoTexto}
              />
            )}
            {detalhe?.confirmado && (
              <Selo
                icone="check"
                texto="Grau pesquisa"
                fundo={cores.selecionado}
                cor={cores.primaria}
              />
            )}
          </View>
        )}

        <View style={estilos.titulos}>
          <Text style={estilos.nome}>{animal.nome}</Text>
          {animal.nome !== animal.nomeCientifico && (
            <Text style={estilos.cientifico}>{animal.nomeCientifico}</Text>
          )}
        </View>

        {detalhe && (
          <View style={estilos.cartao}>
            <Text style={estilos.cartaoTitulo} accessibilityRole="header">
              Informações do avistamento
            </Text>
            {!!detalhe.data && (
              <Info
                icone="calendario"
                rotulo="Data do registro"
                valor={formatarData(detalhe.data)}
              />
            )}
            {!!detalhe.horario && <Info icone="relogio" rotulo="Horário" valor={detalhe.horario} />}
            {!!localizacao && (
              <Info icone="pin" rotulo="Localização aproximada" valor={localizacao} />
            )}
            <Pressable
              onPress={() => Linking.openURL(detalhe.link)}
              accessibilityRole="link"
              hitSlop={6}
              style={estilos.link}>
              <Text style={estilos.linkTexto}>Ver registro no iNaturalist</Text>
              <Icone nome="avancar" cor={cores.primariaMedia} tamanho={16} />
            </Pressable>
          </View>
        )}
        {erroAvistamento && (
          <AvisoErro
            titulo="Não deu para carregar este avistamento"
            mensagem="Mostrando só as informações do animal."
          />
        )}

        {cuidados && (
          <View style={estilos.orientacoes}>
            <View style={estilos.orientacoesTopo}>
              <Icone nome="perigo" cor={cores.perigoTexto} tamanho={26} />
              <Text
                style={[estilos.orientacoesTitulo, { color: cores.perigoTexto }]}
                accessibilityRole="header">
                Orientações de segurança
              </Text>
            </View>
            {cuidados.map((texto) => (
              <View key={texto} style={estilos.item}>
                <Text style={[estilos.itemTexto, { color: cores.perigoTexto }]}>•</Text>
                <Text style={[estilos.itemTexto, estilos.itemCorpo, { color: cores.perigoTexto }]}>
                  {texto}
                </Text>
              </View>
            ))}
          </View>
        )}

        {cuidados && (
          <Pressable
            onPress={() => Linking.openURL('tel:192')}
            accessibilityRole="button"
            accessibilityLabel="Fui picado: ligar para o SAMU, 192"
            style={({ pressed }) => [estilos.samu, pressed && { opacity: 0.85 }]}>
            <Icone nome="telefone" cor={cores.superficie} tamanho={24} />
            <Text style={estilos.samuTexto}>Fui picado: ligar SAMU 192</Text>
          </Pressable>
        )}
      </ScrollView>

      <PopupFoto
        visivel={fotoAberta}
        fotos={fotos}
        inicial={fotoAtual}
        titulo={animal.nome}
        credito={credito}
        onFechar={() => setFotoAberta(false)}
      />
    </SafeAreaView>
  );
}

function Selo({
  icone,
  texto,
  fundo,
  cor,
}: {
  icone: NomeIcone;
  texto: string;
  fundo: string;
  cor: string;
}) {
  return (
    <View style={[estilos.selo, { backgroundColor: fundo }]}>
      <Icone nome={icone} cor={cor} tamanho={16} />
      <Text style={[estilos.seloTexto, { color: cor }]}>{texto}</Text>
    </View>
  );
}

function Info({ icone, rotulo, valor }: { icone: NomeIcone; rotulo: string; valor: string }) {
  return (
    <View style={estilos.info}>
      <Icone nome={icone} cor={cores.primariaMedia} tamanho={24} />
      <View style={estilos.infoTextos}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor}>{valor}</Text>
      </View>
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
    gap: 16,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.lg,
    minHeight: 52,
  },
  voltar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cabecalhoTitulo: {
    flex: 1,
    fontFamily: fontes.monoNegrito,
    fontSize: 20,
    color: cores.primaria,
  },
  coracao: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
  linhaCarregando: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacos.sm,
  },
  foto: {
    height: ALTURA_FOTO,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: cores.fotoVazia,
  },
  semFoto: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  semFotoTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  contadorFoto: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(20, 38, 28, 0.65)',
  },
  contadorTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 11,
    color: cores.superficie,
  },
  credito: {
    marginTop: 4,
    fontFamily: fontes.regular,
    fontSize: 10,
    color: cores.textoSecundario,
  },
  selos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  seloTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
  },
  titulos: {
    gap: 6,
  },
  nome: {
    fontFamily: fontes.monoNegrito,
    fontSize: 30,
    lineHeight: 36,
    color: cores.primaria,
  },
  cientifico: {
    fontFamily: fontes.regular,
    fontStyle: 'italic',
    fontSize: 16,
    color: cores.textoSecundario,
  },
  cartao: {
    gap: 16,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  cartaoTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 16,
    color: cores.primaria,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  infoTextos: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  valor: {
    fontFamily: fontes.semiNegrito,
    fontSize: 16,
    lineHeight: 22,
    color: cores.texto,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    minHeight: 28,
  },
  linkTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  orientacoes: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: cores.perigoFundo,
  },
  orientacoesTopo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 2,
  },
  orientacoesTitulo: {
    flex: 1,
    fontFamily: fontes.monoNegrito,
    fontSize: 16,
  },
  item: {
    flexDirection: 'row',
    gap: 10,
    paddingLeft: 4,
  },
  itemTexto: {
    fontFamily: fontes.regular,
    fontSize: 15,
    lineHeight: 22,
  },
  itemCorpo: {
    flex: 1,
  },
  samu: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: espacos.lg,
    borderRadius: raios.lg + 4,
    backgroundColor: cores.perigoTexto,
  },
  samuTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 17,
    color: cores.superficie,
  },
});
