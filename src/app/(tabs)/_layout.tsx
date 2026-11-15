import { NativeTabs } from 'expo-router/native-tabs';

import { cores } from '@/constants/tema';

/**
 * Navegador 2: abas nativas na parte de baixo da tela.
 * `sf` é o ícone usado no iPhone (SF Symbols) e `md` o do Android (Material Symbols).
 */
export default function TabsLayout() {
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
