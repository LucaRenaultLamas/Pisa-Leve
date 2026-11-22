import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import { TAXONS_POR_ALERGIA, taxonsDasAlergias } from '@/constants/animais';
import { useSessao } from '@/contexts/sessao';
import { ErroApi } from '@/services/inaturalist';
import {
  guardarLocais,
  lerLocais,
  registrosDoLocal,
  type Local,
  type RegistroLocal,
} from '@/services/locais';

export type EstadoLocal =
  | { tipo: 'carregando' }
  | { tipo: 'erro'; mensagem: string }
  | { tipo: 'pronto'; registros: RegistroLocal[] };

export type DadosLocal = Pick<Local, 'nome' | 'tipo' | 'ponto' | 'raioKm' | 'trilhaId'>;

type ValorAlertas = {
  locais: Local[];
  estados: Record<string, EstadoLocal>;
  totalNovos: number;
  checadoEm: number | null;
  carregandoLocais: boolean;
  checarTodos: () => void;
  checarSeVelho: () => void;
  checar: (local: Local) => void;
  adicionar: (dados: DadosLocal) => Local;
  editar: (id: string, dados: DadosLocal) => void;
  remover: (id: string) => void;
  marcarVisto: (id: string) => void;
};

// Voltou pra aba depois disso: confere de novo
const VELHO_MS = 15 * 60_000;

const AlertasContext = createContext<ValorAlertas | null>(null);

let contador = 0;
const novoId = () => `l${Date.now()}-${contador++}`;

export const contarNovos = (estado: EstadoLocal | undefined) =>
  estado?.tipo === 'pronto' ? estado.registros.filter((r) => r.novo).length : 0;

// Locais monitorados: a checagem roda ao abrir o app (o provider fica na raiz)
export function AlertasProvider({ children }: PropsWithChildren) {
  const { usuario, perfil } = useSessao();
  const nomeUsuario = usuario?.usuario ?? null;

  const chaveAlergias = (perfil?.selecionadas ?? [])
    .filter((id) => TAXONS_POR_ALERGIA[id])
    .join(',');
  const taxonsAlergia = useMemo(
    () => taxonsDasAlergias(chaveAlergias ? chaveAlergias.split(',') : []),
    [chaveAlergias],
  );

  const [locais, setLocais] = useState<Local[]>([]);
  const [carregandoLocais, setCarregandoLocais] = useState(true);
  const [estados, setEstados] = useState<Record<string, EstadoLocal>>({});
  const [checadoEm, setChecadoEm] = useState<number | null>(null);

  // Handlers leem sempre o valor de agora
  const agora = useRef({ locais, taxonsAlergia, nomeUsuario, checadoEm });
  agora.current = { locais, taxonsAlergia, nomeUsuario, checadoEm };

  const checar = useCallback((local: Local) => {
    setEstados((e) => ({ ...e, [local.id]: { tipo: 'carregando' } }));
    return registrosDoLocal(local, agora.current.taxonsAlergia)
      .then((registros) => setEstados((e) => ({ ...e, [local.id]: { tipo: 'pronto', registros } })))
      .catch((erro) =>
        setEstados((e) => ({
          ...e,
          [local.id]: {
            tipo: 'erro',
            mensagem:
              erro instanceof ErroApi ? erro.message : 'Algo deu errado ao conferir este local.',
          },
        })),
      );
  }, []);

  // Um local por vez, pra não estourar o limite de pedidos do iNaturalist
  const checarTodos = useCallback(async () => {
    const lista = agora.current.locais;
    setChecadoEm(Date.now());
    for (const local of lista) await checar(local);
  }, [checar]);

  const checarSeVelho = useCallback(() => {
    const { checadoEm: ultimo } = agora.current;
    if (!ultimo || Date.now() - ultimo > VELHO_MS) checarTodos();
  }, [checarTodos]);

  useEffect(() => {
    setLocais([]);
    setEstados({});
    setChecadoEm(null);
    if (!nomeUsuario) return;
    let cancelado = false;
    setCarregandoLocais(true);
    lerLocais(nomeUsuario)
      .catch(() => [])
      .then((lidos) => {
        if (cancelado) return;
        setLocais(lidos);
        agora.current.locais = lidos;
        setCarregandoLocais(false);
        checarTodos();
      });
    return () => {
      cancelado = true;
    };
  }, [nomeUsuario, checarTodos]);

  // Mudou as alergias: o que conta como alerta mudou
  const primeiraVez = useRef(true);
  useEffect(() => {
    if (primeiraVez.current) {
      primeiraVez.current = false;
      return;
    }
    checarTodos();
  }, [taxonsAlergia, checarTodos]);

  const salvar = useCallback((muda: (atuais: Local[]) => Local[]) => {
    const novos = muda(agora.current.locais);
    agora.current.locais = novos;
    setLocais(novos);
    const usuarioAtual = agora.current.nomeUsuario;
    if (usuarioAtual) guardarLocais(usuarioAtual, novos).catch(() => {});
    return novos;
  }, []);

  const adicionar = useCallback(
    (dados: DadosLocal) => {
      const agoraMs = Date.now();
      const local: Local = { ...dados, id: novoId(), criadoEm: agoraMs, vistoEm: agoraMs };
      salvar((atuais) => [...atuais, local]);
      checar(local);
      return local;
    },
    [salvar, checar],
  );

  const editar = useCallback(
    (id: string, dados: DadosLocal) => {
      const novos = salvar((atuais) => atuais.map((l) => (l.id === id ? { ...l, ...dados } : l)));
      const local = novos.find((l) => l.id === id);
      if (local) checar(local);
    },
    [salvar, checar],
  );

  const remover = useCallback(
    (id: string) => {
      salvar((atuais) => atuais.filter((l) => l.id !== id));
      setEstados(({ [id]: _, ...resto }) => resto);
    },
    [salvar],
  );

  const marcarVisto = useCallback(
    (id: string) => {
      salvar((atuais) => atuais.map((l) => (l.id === id ? { ...l, vistoEm: Date.now() } : l)));
      // Não precisa buscar de novo: só deixam de ser novos
      setEstados((e) => {
        const estado = e[id];
        if (estado?.tipo !== 'pronto') return e;
        return {
          ...e,
          [id]: { tipo: 'pronto', registros: estado.registros.map((r) => ({ ...r, novo: false })) },
        };
      });
    },
    [salvar],
  );

  const valor = useMemo(
    () => ({
      locais,
      estados,
      totalNovos: locais.reduce((soma, l) => soma + contarNovos(estados[l.id]), 0),
      checadoEm,
      carregandoLocais,
      checarTodos,
      checarSeVelho,
      checar,
      adicionar,
      editar,
      remover,
      marcarVisto,
    }),
    [
      locais,
      estados,
      checadoEm,
      carregandoLocais,
      checarTodos,
      checarSeVelho,
      checar,
      adicionar,
      editar,
      remover,
      marcarVisto,
    ],
  );

  return <AlertasContext.Provider value={valor}>{children}</AlertasContext.Provider>;
}

export function useAlertas() {
  const valor = useContext(AlertasContext);
  if (!valor) throw new Error('useAlertas precisa estar dentro de <AlertasProvider>');
  return valor;
}
