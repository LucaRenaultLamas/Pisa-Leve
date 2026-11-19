import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { ChipSelecao } from '@/components/ChipSelecao';
import { Icone } from '@/components/Icone';
import { gruposDeAlergias } from '@/constants/alergias';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';

const TAMANHO_MAXIMO = 40;

// Para comparar "Pólen" com "polen " sem ligar pra acento/maiúscula
const comparavel = (texto: string) =>
  texto.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Onboarding() {
  const { perfil, salvarPerfil } = useSessao();
  // Sem perfil = primeiro login. Depois disso o popup só abre pelo Perfil (editar).
  // Fica fixo ao abrir, para não virar "edição" no meio do salvamento.
  const [editando] = useState(perfil !== null);
  const margens = useSafeAreaInsets();

  // Começa com o que já estava salvo (quando vem do Perfil)
  const [selecionadas, setSelecionadas] = useState<string[]>(perfil?.selecionadas ?? []);
  const [outras, setOutras] = useState<string[]>(perfil?.outras ?? []);
  const [novaAlergia, setNovaAlergia] = useState('');
  const [erroNova, setErroNova] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState(false);

  // A folha sobe de baixo quando o popup abre
  const subida = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(subida, {
      toValue: 0,
      damping: 22,
      stiffness: 180,
      useNativeDriver: true,
    }).start();
  }, [subida]);

  // No primeiro login o voltar do Android não fecha: só Salvar ou Pular,
  // e os dois gravam o perfil, então o popup não aparece de novo sozinho
  useEffect(() => {
    if (editando) return;
    const assinatura = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => assinatura.remove();
  }, [editando]);

  function fechar() {
    if (router.canGoBack()) router.back();
    else router.replace('/'); // abriu direto pelo link (ex.: recarregou na web)
  }

  function alternar(id: string) {
    setSelecionadas((atuais) =>
      atuais.includes(id) ? atuais.filter((s) => s !== id) : [...atuais, id],
    );
  }

  type Escolhas = { selecionadas: string[]; outras: string[] };

  // Junta o texto digitado às escolhas; null se for repetido
  function incluirDigitada(): Escolhas | null {
    const texto = novaAlergia.trim().replace(/\s+/g, ' ');
    if (!texto) return { selecionadas, outras };

    // Se for uma das opções da lista, só marca ela
    const daLista = gruposDeAlergias
      .flatMap((g) => g.itens)
      .find((item) => comparavel(item.rotulo) === comparavel(texto));
    if (daLista) {
      setNovaAlergia('');
      const marcadas = selecionadas.includes(daLista.id)
        ? selecionadas
        : [...selecionadas, daLista.id];
      return { selecionadas: marcadas, outras };
    }

    if (outras.some((o) => comparavel(o) === comparavel(texto))) {
      setErroNova('Essa alergia já está na lista.');
      return null;
    }

    setNovaAlergia('');
    return { selecionadas, outras: [...outras, texto] };
  }

  function aplicar(escolhas: Escolhas) {
    setSelecionadas(escolhas.selecionadas);
    setOutras(escolhas.outras);
  }

  function adicionar() {
    const escolhas = incluirDigitada();
    if (escolhas) aplicar(escolhas);
  }

  async function salvar(pulando = false) {
    setErroSalvar(false);
    // Pular = perfil vazio, para não perguntar de novo a cada login
    let escolhas: Escolhas = { selecionadas: [], outras: [] };

    if (!pulando) {
      const comDigitada = incluirDigitada(); // não perde o que ficou no campo
      if (!comDigitada) return;
      escolhas = comDigitada;
      aplicar(escolhas);
    }

    setSalvando(true);
    try {
      await salvarPerfil(escolhas);
      fechar();
    } catch {
      setErroSalvar(true);
      setSalvando(false);
    }
  }

  const total = selecionadas.length + outras.length;
  const tituloBotao = editando ? 'Salvar alterações' : 'Salvar e continuar';
  const contagem = total === 1 ? '1 selecionada' : `${total} selecionadas`;

  return (
    <View style={estilos.popup}>
      {/* Fundo escuro: no 1º acesso não fecha ao tocar, para a pessoa escolher Salvar ou Pular */}
      <Pressable
        style={estilos.fundoEscuro}
        onPress={editando ? fechar : undefined}
        accessible={false}
      />

      <KeyboardAvoidingView behavior="padding" style={estilos.areaFolha} pointerEvents="box-none">
        <Animated.View
          accessibilityViewIsModal
          style={[
            estilos.folha,
            {
              marginTop: margens.top + espacos.xxl,
              transform: [
                {
                  translateY: subida.interpolate({ inputRange: [0, 1], outputRange: [0, 800] }),
                },
              ],
            },
          ]}>
          <View style={estilos.alca} />

          <View style={estilos.cabecalho}>
            <View style={estilos.cabecalhoTextos}>
              <Text style={estilos.rotulo}>
                {editando ? 'PISA LEVE · MEU PERFIL' : 'PISA LEVE · PRIMEIRO ACESSO'}
              </Text>
              <Text style={estilos.titulo} accessibilityRole="header">
                Meu perfil de alergias
              </Text>
            </View>
            {editando && (
              <Pressable
                onPress={fechar}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={estilos.botaoFechar}>
                <Icone nome="fechar" cor={cores.primaria} tamanho={20} espessura={2.2} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={estilos.lista}
            contentContainerStyle={estilos.rolagem}
            keyboardShouldPersistTaps="handled">
            <Text style={estilos.subtitulo}>
              Selecione os itens que causam reações em você. Vamos te avisar quando houver
              registros deles perto de você ou nas trilhas.
            </Text>

            {gruposDeAlergias.map((grupo) => (
              <View key={grupo.titulo} style={estilos.grupo}>
                <Text style={estilos.tituloGrupo}>{grupo.titulo}</Text>
                <View style={estilos.chips}>
                  {grupo.itens.map((item) => (
                    <ChipSelecao
                      key={item.id}
                      rotulo={item.rotulo}
                      marcado={selecionadas.includes(item.id)}
                      onPress={() => alternar(item.id)}
                    />
                  ))}
                </View>
              </View>
            ))}

            <View style={estilos.grupo}>
              <Text style={estilos.tituloGrupo}>Adicionar outra alergia</Text>
              <View style={estilos.linhaNova}>
                <TextInput
                  value={novaAlergia}
                  onChangeText={(texto) => {
                    setNovaAlergia(texto);
                    setErroNova(null);
                  }}
                  placeholder="Ex.: pólen de eucalipto"
                  placeholderTextColor={cores.bordaForte}
                  maxLength={TAMANHO_MAXIMO}
                  returnKeyType="done"
                  submitBehavior="submit"
                  onSubmitEditing={adicionar}
                  accessibilityLabel="Adicionar outra alergia"
                  style={[estilos.campo, !!erroNova && estilos.campoComErro]}
                />
                <Pressable
                  onPress={adicionar}
                  disabled={!novaAlergia.trim()}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    estilos.botaoAdicionar,
                    pressed && { opacity: 0.8 },
                    !novaAlergia.trim() && { opacity: 0.5 },
                  ]}>
                  <Icone nome="mais" cor={cores.primaria} tamanho={18} espessura={2.2} />
                  <Text style={estilos.textoAdicionar}>Adicionar</Text>
                </Pressable>
              </View>
              {!!erroNova && <Text style={estilos.erroNova}>{erroNova}</Text>}

              {outras.length > 0 && (
                <View style={estilos.chips}>
                  {outras.map((outra) => (
                    <ChipSelecao
                      key={outra}
                      rotulo={outra}
                      marcado
                      acao="remover"
                      onPress={() => setOutras((atuais) => atuais.filter((o) => o !== outra))}
                    />
                  ))}
                </View>
              )}
            </View>

            <View style={estilos.nota}>
              <Icone nome="info" cor={cores.textoSecundario} tamanho={16} />
              <Text style={estilos.notaTexto}>
                Seus dados ficam salvos só neste celular. Você pode alterar depois em Perfil.
              </Text>
            </View>
          </ScrollView>

          {/* Rodapé fixo: o botão fica sempre à vista */}
          <View style={[estilos.rodape, { paddingBottom: margens.bottom + espacos.lg }]}>
            {erroSalvar && (
              <AvisoErro
                titulo="Não foi possível salvar"
                mensagem="Houve um problema ao gravar no aparelho. Tente de novo."
              />
            )}
            <Botao
              titulo={total > 0 ? `${tituloBotao} · ${contagem}` : tituloBotao}
              onPress={() => salvar()}
              carregando={salvando}
              tituloCarregando="Salvando…"
            />
            {!editando && (
              <Pressable
                onPress={() => salvar(true)}
                disabled={salvando}
                accessibilityRole="button"
                hitSlop={4}
                style={estilos.pular}>
                <Text style={estilos.pularTexto}>Pular por enquanto</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const estilos = StyleSheet.create({
  popup: {
    flex: 1,
  },
  fundoEscuro: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(20, 38, 28, 0.55)', // cor do texto, translúcida
  },
  areaFolha: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  folha: {
    flexShrink: 1,
    backgroundColor: cores.fundo,
    borderTopLeftRadius: raios.folha,
    borderTopRightRadius: raios.folha,
    overflow: 'hidden',
  },
  alca: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    marginTop: 10,
    backgroundColor: cores.bordaForte,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espacos.md,
    paddingHorizontal: espacos.xl,
    paddingTop: espacos.lg,
    paddingBottom: espacos.md,
  },
  cabecalhoTextos: {
    flex: 1,
    gap: espacos.xs,
  },
  botaoFechar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.superficie,
    borderWidth: 1.5,
    borderColor: cores.borda,
  },
  lista: {
    flexShrink: 1,
  },
  rolagem: {
    paddingHorizontal: espacos.xl,
    paddingBottom: espacos.xxl,
    gap: 22,
  },
  rotulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.primariaMedia,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 22,
    lineHeight: 27,
    color: cores.primaria,
  },
  subtitulo: {
    fontFamily: fontes.regular,
    fontSize: 13,
    lineHeight: 19,
    color: cores.textoSecundario,
  },
  grupo: {
    gap: 10,
  },
  tituloGrupo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 14,
    color: cores.primaria,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  linhaNova: {
    flexDirection: 'row',
    gap: espacos.sm,
  },
  campo: {
    flex: 1,
    minWidth: 0,
    height: 48,
    paddingHorizontal: 14,
    borderRadius: raios.md,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.texto,
  },
  campoComErro: {
    borderColor: cores.erro,
  },
  botaoAdicionar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: espacos.lg,
    borderRadius: raios.md,
    borderWidth: 1.5,
    borderColor: cores.primariaMedia,
    backgroundColor: cores.superficie,
  },
  textoAdicionar: {
    fontFamily: fontes.negrito,
    fontSize: 14,
    color: cores.primaria,
  },
  erroNova: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.erro,
  },
  nota: {
    flexDirection: 'row',
    gap: espacos.sm,
  },
  notaTexto: {
    flex: 1,
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 18,
    color: cores.textoSecundario,
  },
  rodape: {
    gap: 6,
    paddingTop: 14,
    paddingHorizontal: espacos.xl,
    backgroundColor: cores.fundo,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
  },
  pular: {
    alignSelf: 'center',
    padding: espacos.md,
  },
  pularTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.primariaMedia,
  },
});
