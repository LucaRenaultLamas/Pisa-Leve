import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AvisoErro } from '@/components/AvisoErro';
import { Botao } from '@/components/Botao';
import { CampoTexto } from '@/components/CampoTexto';
import { Carregando } from '@/components/Carregando';
import { ChipFiltro } from '@/components/ChipFiltro';
import { EscolherPonto } from '@/components/EscolherPonto';
import { Icone, type NomeIcone } from '@/components/Icone';
import { PopupConfirmacao } from '@/components/PopupConfirmacao';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { CENTRO_JF } from '@/constants/trilhasJF';
import { useAlertas } from '@/contexts/alertas';
import {
  formatarRaio,
  MAX_LOCAIS,
  RAIOS_LOCAL_KM,
  ROTULO_TIPO,
  type TipoLocal,
} from '@/services/locais';
import { ErroLocalizacao, pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';
import { acharTrilha, type Trilha } from '@/services/trilhas';

const TIPOS: { tipo: TipoLocal; icone: NomeIcone }[] = [
  { tipo: 'casa', icone: 'casa' },
  { tipo: 'trabalho', icone: 'maleta' },
  { tipo: 'trilha', icone: 'caminhada' },
  { tipo: 'outro', icone: 'pin' },
];

// Ponto do meio do desenho (ou o início, na lista fixa)
function meioDaTrilha(t: Trilha): Coordenadas {
  const pontos = t.trechos.flat();
  return pontos.length > 0 ? pontos[Math.floor(pontos.length / 2)] : t.inicio;
}

// Menor raio que cobre a trilha a partir do meio dela
function raioDaTrilha(t: Trilha) {
  const metade = (t.comprimentoKm ?? 1) / 2;
  return RAIOS_LOCAL_KM.find((r) => r >= metade) ?? RAIOS_LOCAL_KM[RAIOS_LOCAL_KM.length - 1];
}

export default function NovoLocal() {
  const { id, trilha: trilhaId } = useLocalSearchParams<{ id?: string; trilha?: string }>();
  const { locais, adicionar, editar, remover } = useAlertas();
  const existente = id ? locais.find((l) => l.id === id) : undefined;

  const [nome, setNome] = useState(existente?.nome ?? '');
  const [tipo, setTipo] = useState<TipoLocal>(existente?.tipo ?? 'casa');
  const [raioKm, setRaioKm] = useState(existente?.raioKm ?? 1);
  const [ponto, setPonto] = useState<Coordenadas | null>(existente?.ponto ?? null);
  const [enquadre, setEnquadre] = useState<{ centro: Coordenadas; raioKm: number } | null>(
    existente ? { centro: existente.ponto, raioKm: existente.raioKm } : null,
  );
  const [localizando, setLocalizando] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);
  const [tentouSalvar, setTentouSalvar] = useState(false);
  const [confirmarExcluir, setConfirmarExcluir] = useState(false);

  function irPara(centro: Coordenadas, raio = raioKm) {
    setPonto(centro);
    setEnquadre({ centro, raioKm: raio });
  }

  async function usarMinhaLocalizacao(reserva: boolean) {
    setLocalizando(true);
    setErroLocal(null);
    try {
      irPara(await pegarLocalizacaoAtual());
    } catch (e) {
      setErroLocal(
        e instanceof ErroLocalizacao ? e.message : 'Não deu para achar sua localização.',
      );
      // Primeira vez sem localização: começa em Juiz de Fora
      if (reserva) irPara(CENTRO_JF);
    } finally {
      setLocalizando(false);
    }
  }

  useEffect(() => {
    if (existente) return;
    if (!trilhaId) {
      usarMinhaLocalizacao(true);
      return;
    }
    acharTrilha(trilhaId)
      .then((t) => {
        if (!t) return usarMinhaLocalizacao(true);
        const raio = raioDaTrilha(t);
        setNome(t.nome);
        setTipo('trilha');
        setRaioKm(raio);
        irPara(meioDaTrilha(t), raio);
      })
      .catch(() => usarMinhaLocalizacao(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mudarRaio(km: number) {
    setRaioKm(km);
    // Enquadra de novo no ponto escolhido, com o zoom do raio novo
    if (ponto) setEnquadre({ centro: ponto, raioKm: km });
  }

  const nomeLimpo = nome.trim();
  const cheio = !existente && locais.length >= MAX_LOCAIS;

  function salvar() {
    setTentouSalvar(true);
    if (!nomeLimpo || !ponto || cheio) return;
    const dados = {
      nome: nomeLimpo,
      tipo,
      ponto,
      raioKm,
      trilhaId: existente?.trilhaId ?? trilhaId ?? null,
    };
    if (existente) editar(existente.id, dados);
    else adicionar(dados);
    fechar();
  }

  function fechar() {
    if (router.canGoBack()) router.back();
    else router.replace('/alertas');
  }

  if (id && !existente) {
    return (
      <SafeAreaView style={estilos.tela}>
        <View style={estilos.centro}>
          <AvisoErro titulo="Local não encontrado" mensagem="Ele pode ter sido excluído." />
          <Botao titulo="Voltar" variante="secundario" onPress={fechar} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
        <View style={estilos.topo}>
          <View style={estilos.titulos}>
            <Text style={estilos.marca}>ALERTAS</Text>
            <Text style={estilos.titulo} accessibilityRole="header">
              {existente ? 'Editar local' : 'Novo local'}
            </Text>
          </View>
          <Pressable
            onPress={fechar}
            accessibilityRole="button"
            accessibilityLabel="Fechar sem salvar"
            hitSlop={6}
            style={({ pressed }) => [estilos.fechar, pressed && { opacity: 0.7 }]}>
            <Icone nome="fechar" cor={cores.primaria} tamanho={22} />
          </Pressable>
        </View>
        <Text style={estilos.explicacao}>
          Você recebe alertas de animais peçonhentos e dos ligados às suas alergias registrados
          neste lugar.
        </Text>

        {cheio && (
          <AvisoErro
            titulo={`Limite de ${MAX_LOCAIS} locais`}
            mensagem="Exclua um local na aba Alertas para adicionar outro."
          />
        )}

        <CampoTexto
          rotulo="Nome"
          value={nome}
          onChangeText={setNome}
          placeholder="Ex.: Casa, Sítio da vó"
          maxLength={40}
          erro={tentouSalvar && !nomeLimpo ? 'Dê um nome ao local.' : undefined}
        />

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Tipo</Text>
          <View style={estilos.chips} accessibilityRole="radiogroup">
            {TIPOS.map((t) => (
              <ChipFiltro
                key={t.tipo}
                rotulo={ROTULO_TIPO[t.tipo]}
                rotuloAcessivel={`Tipo: ${ROTULO_TIPO[t.tipo]}`}
                icone={t.icone}
                ativo={tipo === t.tipo}
                onPress={() => setTipo(t.tipo)}
              />
            ))}
          </View>
        </View>

        <View style={estilos.bloco}>
          <View style={estilos.linhaRotulo}>
            <Text style={estilos.rotulo}>Onde fica</Text>
            <Pressable
              onPress={() => usarMinhaLocalizacao(false)}
              accessibilityRole="button"
              accessibilityLabel="Usar minha localização"
              disabled={localizando}
              hitSlop={8}
              style={estilos.acao}>
              {localizando ? (
                <Carregando tamanho="pequeno" />
              ) : (
                <Icone nome="mira" cor={cores.primariaMedia} tamanho={16} />
              )}
              <Text style={estilos.link}>Usar minha localização</Text>
            </Pressable>
          </View>
          {enquadre && ponto ? (
            <EscolherPonto enquadre={enquadre} ponto={ponto} raioKm={raioKm} onMudar={setPonto} />
          ) : (
            <View style={estilos.mapaVazio}>
              <Carregando corFundo={cores.mapaFundo} />
              <Text style={estilos.ajuda}>Procurando sua localização…</Text>
            </View>
          )}
          {erroLocal && <Text style={estilos.ajuda}>{erroLocal}</Text>}
          <Text style={estilos.ajuda}>Arraste o mapa para pôr o pino no lugar certo.</Text>
        </View>

        <View style={estilos.bloco}>
          <Text style={estilos.rotulo}>Avisar o que for registrado a até</Text>
          <View style={estilos.chips} accessibilityRole="radiogroup">
            {RAIOS_LOCAL_KM.map((km) => (
              <ChipFiltro
                key={km}
                rotulo={formatarRaio(km)}
                rotuloAcessivel={`Raio de ${formatarRaio(km)}`}
                ativo={raioKm === km}
                onPress={() => mudarRaio(km)}
              />
            ))}
          </View>
        </View>

        <Botao
          titulo={existente ? 'Salvar mudanças' : 'Monitorar este local'}
          icone="check"
          onPress={salvar}
          desabilitado={cheio || !ponto}
        />
        {existente && (
          <Botao
            titulo="Excluir local"
            variante="perigo"
            icone="lixeira"
            onPress={() => setConfirmarExcluir(true)}
          />
        )}
      </ScrollView>

      <PopupConfirmacao
        visivel={confirmarExcluir}
        titulo="Excluir este local?"
        mensagem={`Você deixa de receber alertas de “${existente?.nome ?? ''}”.`}
        icone="lixeira"
        textoConfirmar="Excluir"
        textoCancelar="Cancelar"
        perigo
        onConfirmar={() => {
          setConfirmarExcluir(false);
          if (existente) remover(existente.id);
          // Sai também do detalhe do local, que deixou de existir
          router.dismissTo('/alertas');
        }}
        onCancelar={() => setConfirmarExcluir(false)}
      />
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
    paddingTop: espacos.lg,
    paddingBottom: espacos.xxl,
    gap: espacos.lg,
  },
  centro: {
    flex: 1,
    justifyContent: 'center',
    gap: espacos.md,
    padding: espacos.xl,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: espacos.md,
  },
  titulos: {
    gap: espacos.xs,
    flex: 1,
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
  fechar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  explicacao: {
    marginTop: -espacos.sm,
    fontFamily: fontes.regular,
    fontSize: 13,
    lineHeight: 19,
    color: cores.textoSecundario,
  },
  bloco: {
    gap: espacos.sm,
  },
  rotulo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.texto,
  },
  linhaRotulo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  acao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  link: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  mapaVazio: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacos.sm,
    borderRadius: raios.lg,
    backgroundColor: cores.mapaFundo,
  },
  ajuda: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 17,
    color: cores.textoSecundario,
  },
});
