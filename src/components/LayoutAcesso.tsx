import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { CabecalhoAcesso } from '@/components/CabecalhoAcesso';
import { cores, espacos, raios } from '@/constants/tema';

type Props = ComponentProps<typeof CabecalhoAcesso> & {
  children: ReactNode;
};

// Moldura de Entrar e Criar conta: topo verde + formulário
export function LayoutAcesso({ children, ...cabecalho }: Props) {
  const margens = useSafeAreaInsets();

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={estilos.tela} behavior="padding">
        <ScrollView
          style={estilos.tela}
          contentContainerStyle={estilos.rolagem}
          keyboardShouldPersistTaps="handled"
          bounces={false}>
          <CabecalhoAcesso {...cabecalho} />
          <View style={[estilos.folha, { paddingBottom: margens.bottom + espacos.xxl }]}>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.primaria,
  },
  rolagem: {
    flexGrow: 1,
  },
  folha: {
    flexGrow: 1,
    backgroundColor: cores.fundo,
    borderTopLeftRadius: raios.folha,
    borderTopRightRadius: raios.folha,
    paddingTop: 30,
    paddingHorizontal: espacos.xxl,
    gap: 18,
  },
});
