import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Carregando } from '@/components/Carregando';
import { CartaoTrilha } from '@/components/CartaoTrilha';
import { ChipFiltro } from '@/components/ChipFiltro';
import { Icone } from '@/components/Icone';
import { TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useFavoritas } from '@/contexts/favoritas';
import { useSessao } from '@/contexts/sessao';
import { guardarAnimaisSalvos, lerAnimaisSalvos, type AnimalSalvo } from '@/services/animaisSalvos';
import { calcularRisco, type RiscoTrilha } from '@/services/risco';
import { lembrarTrilha, type Trilha } from '@/services/trilhas';

type Parte = 'animais' | 'trilhas';

function abrirTrilha(t: Trilha) {
  lembrarTrilha(t);
  router.push({ pathname: '/trilha/[id]', params: { id: t.id } });
}

export default function Salvos() {
  const { usuario, perfil } = useSessao();
  const { favoritas, alternar } = useFavoritas();
  const [parte, setParte] = useState<Parte>('animais');
  const [animais, setAnimais] = useState<AnimalSalvo[] | null>(null);
  const [riscos, setRiscos] = useState<Record<string, RiscoTrilha | null>>({});

  const nomeUsuario = usuario?.usuario;
  // Lê de novo ao voltar: o coração do detalhe do animal pode ter mudado a lista
  useFocusEffect(
    useCallback(() => {
      if (!nomeUsuario) return;
      lerAnimaisSalvos(nomeUsuario)
        .then((lidos) => setAnimais([...lidos].sort((a, b) => b.salvoEm - a.salvoEm)))
        .catch(() => setAnimais([]));
    }, [nomeUsuario]),
  );

  const chaveAlergias = (perfil?.selecionadas ?? [])
    .filter((id) => TAXONS_POR_ALERGIA[id])
    .join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  // Risco das trilhas salvas, uma por vez (o cálculo é reaproveitado da aba Trilhas)
  useEffect(() => {
    if (parte !== 'trilhas') return;
    let cancelado = false;
    (async () => {
      for (const t of favoritas) {
        if (cancelado) return;
        const risco = await calcularRisco(t, taxonsAlergia).catch(() => null);
        if (!cancelado) setRiscos((r) => ({ ...r, [t.id]: risco }));
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [parte, favoritas, taxonsAlergia]);

  function tirarAnimal(a: AnimalSalvo) {
    if (!nomeUsuario || !animais) return;
    const novos = animais.filter((x) => x.taxonId !== a.taxonId);
    setAnimais(novos);
    guardarAnimaisSalvos(nomeUsuario, novos).catch(() => {});
  }

  const voltar = () => (router.canGoBack() ? router.back() : router.replace('/alertas'));

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.rolagem}>
        <View style={estilos.topo}>
          <Pressable
            onPress={voltar}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
            hitSlop={4}
            style={({ pressed }) => [estilos.botaoRedondo, pressed && { opacity: 0.7 }]}>
            <Icone nome="voltar" cor={cores.primaria} tamanho={22} />
          </Pressable>
          <View style={estilos.titulos}>
            <Text style={estilos.marca}>ALERTAS</Text>
            <Text style={estilos.titulo} accessibilityRole="header">
              Salvos
            </Text>
          </View>
        </View>

        <View style={estilos.chips} accessibilityRole="radiogroup">
          <ChipFiltro
            rotulo={`Animais (${animais?.length ?? 0})`}
            icone="folha"
            rotuloAcessivel="Ver animais salvos"
            ativo={parte === 'animais'}
            onPress={() => setParte('animais')}
          />
          <ChipFiltro
            rotulo={`Trilhas (${favoritas.length})`}
            icone="caminhada"
            rotuloAcessivel="Ver trilhas salvas"
            ativo={parte === 'trilhas'}
            onPress={() => setParte('trilhas')}
          />
        </View>

        {parte === 'animais' ? (
          animais === null ? (
            <Carregando style={estilos.carregando} />
          ) : animais.length === 0 ? (
            <Vazio
              texto="Nenhum animal salvo. Toque no coração ao lado do nome de um animal para guardar aqui."
              botao="Buscar animais"
              onPress={() => router.navigate('/busca')}
            />
          ) : (
            <View style={estilos.lista}>
              {animais.map((a) => (
                <LinhaAnimal key={a.taxonId} animal={a} onTirar={tirarAnimal} />
              ))}
            </View>
          )
        ) : favoritas.length === 0 ? (
          <Vazio
            texto="Nenhuma trilha salva. Toque no coração de uma trilha para guardar aqui."
            botao="Ver trilhas"
            onPress={() => router.navigate('/trilhas')}
          />
        ) : (
          <View style={estilos.lista}>
            {favoritas.map((t) => (
              <CartaoTrilha
                key={t.id}
                trilha={t}
                referencia={null}
                risco={riscos[t.id]}
                favorita
                onAbrir={abrirTrilha}
                onFavoritar={alternar}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function LinhaAnimal({
  animal,
  onTirar,
}: {
  animal: AnimalSalvo;
  onTirar: (a: AnimalSalvo) => void;
}) {
  const { nome, nomeCientifico, foto, peconhento } = animal;
  return (
    <View style={estilos.cartao}>
      {/* Toque no cartão abre; o coração ao lado tira dos salvos (Pressables lado a lado) */}
      <Pressable
        onPress={() =>
          router.push({ pathname: '/animal/[id]', params: { id: String(animal.taxonId) } })
        }
        accessibilityRole="link"
        accessibilityLabel={`${nome}${peconhento ? ', peçonhento' : ''}`}
        style={({ pressed }) => [estilos.cartaoAbrir, pressed && { opacity: 0.85 }]}>
        {foto ? (
          <Image source={foto} style={estilos.foto} contentFit="cover" transition={150} />
        ) : (
          <View style={[estilos.foto, estilos.semFoto]}>
            <Icone nome="foto" cor={cores.primaria} tamanho={22} />
          </View>
        )}
        <View style={estilos.textos}>
          <Text style={estilos.nome} numberOfLines={1}>
            {nome}
          </Text>
          {nome !== nomeCientifico && (
            <Text style={estilos.cientifico} numberOfLines={1}>
              {nomeCientifico}
            </Text>
          )}
          {peconhento && (
            <View style={estilos.selo}>
              <Icone nome="perigo" cor={cores.perigoTexto} tamanho={12} />
              <Text style={estilos.seloTexto}>Peçonhento</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={() => onTirar(animal)}
        accessibilityRole="button"
        accessibilityLabel={`Tirar ${nome} dos salvos`}
        hitSlop={8}
        style={({ pressed }) => [estilos.coracao, pressed && { opacity: 0.7 }]}>
        <Icone nome="coracaoCheio" cor={cores.erro} tamanho={22} />
      </Pressable>
    </View>
  );
}

function Vazio({ texto, botao, onPress }: { texto: string; botao: string; onPress: () => void }) {
  return (
    <View style={estilos.vazio}>
      <Icone nome="coracao" cor={cores.textoSecundario} tamanho={26} />
      <Text style={estilos.vazioTexto}>{texto}</Text>
      <Botao titulo={botao} variante="secundario" onPress={onPress} />
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
    gap: espacos.lg,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
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
  titulos: {
    gap: 2,
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
  chips: {
    flexDirection: 'row',
    gap: espacos.sm,
  },
  carregando: {
    paddingVertical: 30,
  },
  lista: {
    gap: 10,
  },
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 12,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  cartaoAbrir: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
  },
  foto: {
    width: 64,
    height: 64,
    borderRadius: raios.md,
    backgroundColor: cores.fotoVazia,
  },
  semFoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  nome: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    color: cores.texto,
  },
  cientifico: {
    fontFamily: fontes.regular,
    fontStyle: 'italic',
    fontSize: 12,
    color: cores.textoSecundario,
  },
  selo: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: cores.perigoFundo,
  },
  seloTexto: {
    fontFamily: fontes.negrito,
    fontSize: 11,
    color: cores.perigoTexto,
  },
  coracao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  vazioTexto: {
    fontFamily: fontes.regular,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    color: cores.textoSecundario,
  },
});
