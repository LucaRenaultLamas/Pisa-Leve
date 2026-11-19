import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect } from 'react';

import { cores } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';

// Abas de baixo. sf = ícone do iPhone, md = do Android
export default function TabsLayout() {
  const { perfil } = useSessao();

  // Primeiro login (conta sem perfil de alergias): abre o popup uma vez.
  // Depois de salvar ou pular, ele só abre pelo Perfil.
  useEffect(() => {
    if (!perfil) router.push('/onboarding');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <NativeTabs
      backgroundColor={cores.superficie}
      indicatorColor={cores.selecionado}
      tintColor={cores.primaria}
      iconColor={{ default: cores.textoSecundario, selected: cores.primaria }}
      labelStyle={{
        default: { color: cores.textoSecundario },
        selected: { color: cores.primaria },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map" md="map" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trilhas">
        <NativeTabs.Trigger.Label>Trilhas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="figure.hiking" md="hiking" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="busca">
        <NativeTabs.Trigger.Label>Buscar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="magnifyingglass" md="search" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="alertas">
        <NativeTabs.Trigger.Label>Alertas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="perfil">
        <NativeTabs.Trigger.Label>Perfil</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person" md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
