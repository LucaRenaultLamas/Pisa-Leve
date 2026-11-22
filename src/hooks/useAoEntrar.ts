import { router } from 'expo-router';
import { useEffect } from 'react';

import { taxonsDasAlergias } from '@/constants/animais';
import { useSessao } from '@/contexts/sessao';
import { preCarregarTrilhas } from '@/services/buscaTrilhas';

// O que roda uma vez quando a pessoa entra nas abas (celular e web)
export function useAoEntrar() {
  const { perfil } = useSessao();

  useEffect(() => {
    // 1º login: abre o popup de alergias uma vez só
    if (!perfil) router.push('/onboarding');
    // Trilhas começam a ser buscadas já ao abrir: a Overpass leva ~30 s
    preCarregarTrilhas(taxonsDasAlergias(perfil?.selecionadas ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
