import { useRef, useState, type ComponentRef } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

export type OpcaoFiltro = { valor: string; rotulo: string; cor?: string };
export type OperadorFiltro = { valor: string; rotulo: string; varios?: boolean };
export type CampoFiltro = {
  id: string;
  rotulo: string;
  icone: NomeIcone;
  operadores: OperadorFiltro[];
  opcoes: OpcaoFiltro[];
  // Fixo: ficha sempre presente, sem × e fora do "+ Filtro"/"Limpar"
  fixo?: boolean;
  rotuloFicha?: string;
  acoes?: AcaoFiltro[];
};
export type AcaoFiltro = { rotulo: string; icone: NomeIcone; onPress: () => void };
export type FiltroAplicado = { id: string; campo: string; operador: string; valores: string[] };

type Props = {
  campos: CampoFiltro[];
  valor: FiltroAplicado[];
  onChange: (filtros: FiltroAplicado[]) => void;
};

type Retangulo = { x: number; y: number; largura: number; altura: number };
type Aberto =
  | { tipo: 'novo'; ancora: Retangulo }
  | { tipo: 'campo' | 'operador' | 'valor'; filtroId: string; ancora: Retangulo };

const LARGURA_LISTA = 240;
const ALTURA_MAX_LISTA = 300;

let contador = 0;
const novoId = () => `f${Date.now()}-${contador++}`;

function resumo(campo: CampoFiltro | undefined, valores: string[]) {
  if (valores.length === 0) return { texto: 'Escolher…', vazio: true };
  const rotulo = (v: string) => campo?.opcoes.find((o) => o.valor === v)?.rotulo ?? v;
  if (valores.length <= 2) return { texto: valores.map(rotulo).join(', '), vazio: false };
  return { texto: `${rotulo(valores[0])} +${valores.length - 1}`, vazio: false };
}

// Filtros em "fichas" (campo | operador | valores | ×), cada parte abre uma lista logo abaixo
export function BarraFiltros({ campos, valor, onChange }: Props) {
  const [aberto, setAberto] = useState<Aberto | null>(null);
  const tela = useWindowDimensions();
  const ancoras = useRef(new Map<string, ComponentRef<typeof View>>());

  const guardar = (chave: string) => (el: ComponentRef<typeof View> | null) => {
    if (el) ancoras.current.set(chave, el);
    else ancoras.current.delete(chave);
  };

  // Mede onde o botão está na tela pra lista abrir colada nele
  function abrir(chave: string, monta: (ancora: Retangulo) => Aberto) {
    const el = ancoras.current.get(chave);
    if (!el) return;
    el.measureInWindow((x, y, largura, altura) => setAberto(monta({ x, y, largura, altura })));
  }

  const campoDe = (id: string) => campos.find((c) => c.id === id);
  const camposLivres = campos.filter((c) => !c.fixo);
  const removiveis = valor.filter((f) => !campoDe(f.campo)?.fixo);

  function adicionar(campoId: string, ancora: Retangulo) {
    const campo = campoDe(campoId);
    if (!campo) return;
    const filtro = {
      id: novoId(),
      campo: campoId,
      operador: campo.operadores[0].valor,
      valores: [],
    };
    onChange([...valor, filtro]);
    // Já emenda na escolha dos valores, no mesmo lugar
    setAberto({ tipo: 'valor', filtroId: filtro.id, ancora });
  }

  function mudar(filtroId: string, muda: (f: FiltroAplicado) => FiltroAplicado) {
    onChange(valor.map((f) => (f.id === filtroId ? muda(f) : f)));
  }

  function lista(): {
    titulo: string;
    itens: { valor: string; rotulo: string; marcado: boolean; cor?: string; icone?: NomeIcone }[];
    varios: boolean;
    escolher: (v: string) => void;
    acoes?: AcaoFiltro[];
  } | null {
    if (!aberto) return null;

    if (aberto.tipo === 'novo' || aberto.tipo === 'campo') {
      const atual =
        aberto.tipo === 'campo' ? valor.find((f) => f.id === aberto.filtroId)?.campo : undefined;
      return {
        titulo: 'Filtrar por',
        varios: false,
        itens: camposLivres.map((c) => ({
          valor: c.id,
          rotulo: c.rotulo,
          icone: c.icone,
          marcado: c.id === atual,
        })),
        escolher: (v) => {
          if (aberto.tipo === 'novo') return adicionar(v, aberto.ancora);
          const campo = campoDe(v);
          mudar(aberto.filtroId, (f) => ({
            ...f,
            campo: v,
            operador: campo?.operadores[0].valor ?? f.operador,
            valores: [],
          }));
          setAberto({ ...aberto, tipo: 'valor' });
        },
      };
    }

    const filtro = valor.find((f) => f.id === aberto.filtroId);
    const campo = campoDe(filtro?.campo ?? '');
    if (!filtro || !campo) return null;

    if (aberto.tipo === 'operador') {
      return {
        titulo: campo.rotulo,
        varios: false,
        itens: campo.operadores.map((o) => ({
          valor: o.valor,
          rotulo: o.rotulo,
          marcado: o.valor === filtro.operador,
        })),
        escolher: (v) => {
          const varios = campo.operadores.find((o) => o.valor === v)?.varios;
          // Trocou pra um operador de um valor só: fica só o primeiro
          mudar(filtro.id, (f) => ({
            ...f,
            operador: v,
            valores: varios ? f.valores : f.valores.slice(0, 1),
          }));
          setAberto(null);
        },
      };
    }

    const varios = !!campo.operadores.find((o) => o.valor === filtro.operador)?.varios;
    return {
      titulo: campo.rotulo,
      varios,
      acoes: campo.acoes,
      itens: campo.opcoes.map((o) => ({
        valor: o.valor,
        rotulo: o.rotulo,
        cor: o.cor,
        marcado: filtro.valores.includes(o.valor),
      })),
      escolher: (v) => {
        mudar(filtro.id, (f) => ({
          ...f,
          valores: !varios
            ? [v]
            : f.valores.includes(v)
              ? f.valores.filter((x) => x !== v)
              : [...f.valores, v],
        }));
        if (!varios) setAberto(null);
      },
    };
  }

  const conteudo = lista();
  let posicao = { top: 0, left: 0 };
  if (aberto) {
    const { x, y, altura } = aberto.ancora;
    const left = Math.max(8, Math.min(x, tela.width - LARGURA_LISTA - 8));
    const abaixo = y + altura + 6;
    // Sem espaço embaixo: abre pra cima
    const top = abaixo + ALTURA_MAX_LISTA > tela.height - 8 ? y - 6 - ALTURA_MAX_LISTA : abaixo;
    posicao = { top: Math.max(8, top), left };
  }

  return (
    <View style={estilos.barra} accessibilityRole="toolbar" accessibilityLabel="Filtros">
      {valor.map((f) => {
        const campo = campoDe(f.campo);
        const operador = campo?.operadores.find((o) => o.valor === f.operador);
        const { texto, vazio } = resumo(campo, f.valores);
        const ativo = (tipo: string) =>
          aberto?.tipo === tipo && 'filtroId' in aberto && aberto.filtroId === f.id;
        const fixo = !!campo?.fixo;
        const rotuloCampo = campo?.rotuloFicha ?? campo?.rotulo ?? f.campo;

        return (
          <View key={f.id} style={estilos.ficha}>
            <Pressable
              ref={guardar(`${f.id}:campo`)}
              onPress={() =>
                abrir(`${f.id}:campo`, (ancora) => ({
                  tipo: fixo ? 'valor' : 'campo',
                  filtroId: f.id,
                  ancora,
                }))
              }
              accessibilityRole="button"
              accessibilityLabel={
                fixo
                  ? `${rotuloCampo}. Trocar ${campo?.rotulo}`
                  : `Campo: ${rotuloCampo}. Trocar campo`
              }
              style={[estilos.parte, ativo('campo') && estilos.parteAtiva]}>
              {campo && <Icone nome={campo.icone} cor={cores.textoSecundario} tamanho={14} />}
              <Text style={[estilos.campo, estilos.campoTexto]} numberOfLines={1}>
                {rotuloCampo}
              </Text>
            </Pressable>
            <View style={estilos.divisor} />
            <Pressable
              ref={guardar(`${f.id}:operador`)}
              onPress={() =>
                abrir(`${f.id}:operador`, (ancora) => ({
                  tipo: 'operador',
                  filtroId: f.id,
                  ancora,
                }))
              }
              accessibilityRole="button"
              accessibilityLabel={`Operador: ${operador?.rotulo}. Trocar operador`}
              style={[estilos.parte, ativo('operador') && estilos.parteAtiva]}>
              <Text style={estilos.operador}>{operador?.rotulo ?? f.operador}</Text>
            </Pressable>
            <View style={estilos.divisor} />
            <Pressable
              ref={guardar(`${f.id}:valor`)}
              onPress={() =>
                abrir(`${f.id}:valor`, (ancora) => ({ tipo: 'valor', filtroId: f.id, ancora }))
              }
              accessibilityRole="button"
              accessibilityLabel={`Valor: ${vazio ? 'nada escolhido' : texto}. Trocar valor`}
              style={[estilos.parte, ativo('valor') && estilos.parteAtiva]}>
              <Text style={[estilos.valor, vazio && estilos.valorVazio]} numberOfLines={1}>
                {texto}
              </Text>
            </Pressable>
            {!fixo && (
              <Pressable
                onPress={() => onChange(valor.filter((x) => x.id !== f.id))}
                accessibilityRole="button"
                accessibilityLabel={`Tirar o filtro ${campo?.rotulo ?? ''}`}
                hitSlop={4}
                style={({ pressed }) => [estilos.remover, pressed && estilos.parteAtiva]}>
                <Icone nome="fechar" cor={cores.textoSecundario} tamanho={14} />
              </Pressable>
            )}
          </View>
        );
      })}

      <Pressable
        ref={guardar('novo')}
        onPress={() => abrir('novo', (ancora) => ({ tipo: 'novo', ancora }))}
        accessibilityRole="button"
        accessibilityLabel={removiveis.length === 0 ? 'Adicionar filtro' : 'Mais um filtro'}
        style={({ pressed }) => [estilos.adicionar, pressed && { opacity: 0.7 }]}>
        <Icone nome="mais" cor={cores.textoSecundario} tamanho={14} />
        <Text style={estilos.adicionarTexto}>
          {removiveis.length === 0 ? 'Adicionar filtro' : 'Filtro'}
        </Text>
      </Pressable>

      {removiveis.length > 1 && (
        <Pressable
          onPress={() => onChange(valor.filter((f) => campoDe(f.campo)?.fixo))}
          accessibilityRole="button"
          accessibilityLabel="Limpar todos os filtros"
          style={({ pressed }) => [estilos.limpar, pressed && { opacity: 0.7 }]}>
          <Text style={estilos.limparTexto}>Limpar</Text>
        </Pressable>
      )}

      <Modal
        visible={!!aberto && !!conteudo}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setAberto(null)}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setAberto(null)}
          accessibilityRole="button"
          accessibilityLabel="Fechar lista"
        />
        {conteudo && (
          <View
            style={[estilos.lista, posicao]}
            accessibilityRole="list"
            accessibilityLabel={conteudo.titulo}>
            <Text style={estilos.listaTitulo}>{conteudo.titulo}</Text>
            <ScrollView style={{ maxHeight: ALTURA_MAX_LISTA - 40 }}>
              {conteudo.itens.map((item) => (
                <Pressable
                  key={item.valor}
                  onPress={() => conteudo.escolher(item.valor)}
                  accessibilityRole={conteudo.varios ? 'checkbox' : 'radio'}
                  accessibilityState={{ checked: item.marcado }}
                  style={({ pressed }) => [estilos.item, pressed && estilos.itemAtivo]}>
                  {conteudo.varios && (
                    <View style={[estilos.caixinha, item.marcado && estilos.caixinhaMarcada]}>
                      {item.marcado && <Icone nome="check" cor={cores.superficie} tamanho={11} />}
                    </View>
                  )}
                  {item.icone && (
                    <Icone nome={item.icone} cor={cores.textoSecundario} tamanho={15} />
                  )}
                  {item.cor && <View style={[estilos.bolinha, { backgroundColor: item.cor }]} />}
                  <Text style={estilos.itemTexto} numberOfLines={1}>
                    {item.rotulo}
                  </Text>
                  {!conteudo.varios && item.marcado && (
                    <Icone nome="check" cor={cores.primariaMedia} tamanho={15} />
                  )}
                </Pressable>
              ))}
            </ScrollView>
            {conteudo.acoes?.map((acao) => (
              <Pressable
                key={acao.rotulo}
                onPress={() => {
                  setAberto(null);
                  acao.onPress();
                }}
                accessibilityRole="button"
                style={({ pressed }) => [estilos.item, estilos.acao, pressed && estilos.itemAtivo]}>
                <Icone nome={acao.icone} cor={cores.primariaMedia} tamanho={15} />
                <Text style={estilos.acaoTexto} numberOfLines={1}>
                  {acao.rotulo}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </Modal>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  ficha: {
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  parte: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  parteAtiva: {
    backgroundColor: cores.selecionado,
  },
  divisor: {
    width: 1,
    backgroundColor: cores.borda,
  },
  campo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.texto,
  },
  campoTexto: {
    maxWidth: 160,
  },
  operador: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  valor: {
    maxWidth: 170,
    fontFamily: fontes.negrito,
    fontSize: 13,
    color: cores.primaria,
  },
  valorVazio: {
    fontFamily: fontes.regular,
    color: cores.bordaForte,
  },
  remover: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  adicionar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: cores.bordaForte,
  },
  adicionarTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  limpar: {
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  limparTexto: {
    fontFamily: fontes.media,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  lista: {
    position: 'absolute',
    width: LARGURA_LISTA,
    padding: 4,
    borderRadius: raios.md,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    boxShadow: '0 8px 24px rgba(20, 38, 28, 0.18)',
  },
  listaTitulo: {
    paddingHorizontal: espacos.sm,
    paddingTop: 6,
    paddingBottom: 4,
    fontFamily: fontes.semiNegrito,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: cores.textoSecundario,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacos.sm,
    minHeight: 40,
    paddingHorizontal: espacos.sm,
    borderRadius: raios.sm,
  },
  itemAtivo: {
    backgroundColor: cores.fundo,
  },
  itemTexto: {
    flex: 1,
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.texto,
  },
  acao: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    borderRadius: 0,
  },
  acaoTexto: {
    flex: 1,
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.primariaMedia,
  },
  caixinha: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caixinhaMarcada: {
    borderColor: cores.primaria,
    backgroundColor: cores.primaria,
  },
  bolinha: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
