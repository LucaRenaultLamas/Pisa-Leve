import { Link, router, useCanGoBack } from 'expo-router';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = {
  numero: number;
  titulo: string;
  rota: string;
  children?: ReactNode;
};

/**
 * Tela provisória 
 * Cada etapa do projeto substitui um destes pelo conteúdo de verdade.
 */
export function EmConstrucao({ numero, titulo, rota, children }: Props) {
  const podeVoltar = useCanGoBack();

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      {podeVoltar && (
        <Pressable onPress={() => router.back()} style={estilos.voltar} hitSlop={8}>
          <Text style={estilos.voltarTexto}>← Voltar</Text>
        </Pressable>
      )}

      <View style={estilos.conteudo}>
        <Text style={estilos.rotulo}>TELA {numero} · EM CONSTRUÇÃO</Text>
        <Text style={estilos.titulo}>{titulo}</Text>
        <Text style={estilos.rota}>{rota}</Text>
        {children && <View style={estilos.extras}>{children}</View>}
      </View>
    </SafeAreaView>
  );
}

type LinkDeTesteProps = {
  href: ComponentProps<typeof Link>['href'];
  children: string;
};

/** Link simples para testar a navegação entre as telas provisórias. */
export function LinkDeTeste({ href, children }: LinkDeTesteProps) {
  return (
    <Link href={href} style={estilos.link}>
      {children}
    </Link>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: cores.fundo,
  },
  voltar: {
    alignSelf: 'flex-start',
    paddingHorizontal: espacos.xl,
    paddingVertical: espacos.md,
  },
  voltarTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 15,
    color: cores.primariaMedia,
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: espacos.xl,
    gap: espacos.sm,
  },
  rotulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 11,
    letterSpacing: 1.5,
    color: cores.primariaMedia,
  },
  titulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 24,
    color: cores.primaria,
  },
  rota: {
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.textoSecundario,
  },
  extras: {
    marginTop: espacos.xl,
    gap: espacos.sm,
  },
  link: {
    fontFamily: fontes.semiNegrito,
    fontSize: 15,
    color: cores.primaria,
    backgroundColor: cores.superficie,
    borderWidth: 1.5,
    borderColor: cores.borda,
    borderRadius: raios.md,
    paddingHorizontal: espacos.lg,
    paddingVertical: espacos.md,
    overflow: 'hidden',
  },
});
