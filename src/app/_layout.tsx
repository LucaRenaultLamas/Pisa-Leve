import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { cores } from '@/constants/tema';
import { AlertasProvider } from '@/contexts/alertas';
import { FavoritasProvider } from '@/contexts/favoritas';
import { SessaoProvider, useSessao } from '@/contexts/sessao';

// Segura a splash até carregar as fontes e o login salvo
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessaoProvider>
        <FavoritasProvider>
          <AlertasProvider>
            <NavegadorRaiz />
          </AlertasProvider>
        </FavoritasProvider>
      </SessaoProvider>
    </SafeAreaProvider>
  );
}

function NavegadorRaiz() {
  const { usuario, carregando } = useSessao();
  const [fontesCarregadas, erroFontes] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceMono_400Regular,
    SpaceMono_700Bold,
  });

  const pronto = (fontesCarregadas || !!erroFontes) && !carregando;

  useEffect(() => {
    if (pronto) SplashScreen.hideAsync();
  }, [pronto]);

  if (!pronto) {
    return null;
  }

  const logado = usuario !== null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: cores.fundo },
        }}>
        {/* Só pra quem ainda não entrou */}
        <Stack.Protected guard={!logado}>
          <Stack.Screen name="login" />
          <Stack.Screen name="registrar" />
        </Stack.Protected>

        {/* Resto do app: precisa estar logado */}
        <Stack.Protected guard={logado} redirectTo="/login">
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="animal/[id]" />
          <Stack.Screen name="trilha/[id]" />
          <Stack.Screen name="local/novo" options={{ presentation: 'modal' }} />
          {/* Popup por cima da tela atual: o fundo transparente deixa o app aparecer atrás */}
          <Stack.Screen
            name="onboarding"
            options={{
              presentation: 'transparentModal',
              animation: 'fade',
              gestureEnabled: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}
