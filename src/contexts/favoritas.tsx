import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { useSessao } from '@/contexts/sessao';
import { lerFavoritas, salvarFavoritas } from '@/services/favoritas';
import type { Trilha } from '@/services/trilhas';

type ValorFavoritas = {
  favoritas: Trilha[]; // a mais recente primeiro
  ehFavorita: (id: string) => boolean;
  alternar: (trilha: Trilha) => void;
};

const FavoritasContext = createContext<ValorFavoritas | null>(null);

export function FavoritasProvider({ children }: PropsWithChildren) {
  const { usuario } = useSessao();
  const nomeUsuario = usuario?.usuario ?? null;
  const [favoritas, setFavoritas] = useState<Trilha[]>([]);

  useEffect(() => {
    setFavoritas([]);
    if (!nomeUsuario) return;
    lerFavoritas(nomeUsuario)
      .then(setFavoritas)
      .catch(() => setFavoritas([]));
  }, [nomeUsuario]);

  const alternar = useCallback(
    (trilha: Trilha) => {
      if (!nomeUsuario) return;
      setFavoritas((atuais) => {
        const novas = atuais.some((t) => t.id === trilha.id)
          ? atuais.filter((t) => t.id !== trilha.id)
          : [trilha, ...atuais];
        // A tela muda na hora; salvar no aparelho vai por trás
        salvarFavoritas(nomeUsuario, novas).catch(() => {});
        return novas;
      });
    },
    [nomeUsuario],
  );

  const valor = useMemo(() => {
    const ids = new Set(favoritas.map((t) => t.id));
    return { favoritas, ehFavorita: (id: string) => ids.has(id), alternar };
  }, [favoritas, alternar]);

  return <FavoritasContext.Provider value={valor}>{children}</FavoritasContext.Provider>;
}

export function useFavoritas() {
  const valor = useContext(FavoritasContext);
  if (!valor) throw new Error('useFavoritas precisa estar dentro de <FavoritasProvider>');
  return valor;
}
