import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/Botao';
import { Icone } from '@/components/Icone';
import { gruposDeAlergias } from '@/constants/alergias';
import { cores, espacos, fontes, raios } from '@/constants/tema';
import { useSessao } from '@/contexts/sessao';

// Troca os ids salvos pelos nomes da lista
const rotuloPorId = new Map(
  gruposDeAlergias.flatMap((g) => g.itens).map((item) => [item.id, item.rotulo]),
);

// Etapa 8 ainda por fazer: por enquanto só "Minhas alergias" (do mockup) e Sair
export default function Perfil() {
  const { usuario, perfil, sair } = useSessao();

  const alergias = [
    ...(perfil?.selecionadas ?? []).map((id) => rotuloPorId.get(id) ?? id),
    ...(perfil?.outras ?? []),
  ];

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={estilos.rolagem}>
        <View style={estilos.cabecalho}>
          <Text style={estilos.rotulo}>PISA LEVE</Text>
          <Text style={estilos.titulo} accessibilityRole="header">
            Meu perfil
          </Text>
          {usuario && (
            <Text style={estilos.usuario}>
              {usuario.nome} · @{usuario.usuario}
            </Text>
          )}
        </View>

        <View style={estilos.cartao}>
          <View style={estilos.cartaoTopo}>
            <Text style={estilos.cartaoTitulo}>Minhas alergias</Text>
            {/* Único caminho para o formulário depois do primeiro login */}
            <Pressable
              onPress={() => router.push('/onboarding')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Editar minhas alergias">
              <Text style={estilos.editar}>Editar</Text>
            </Pressable>
          </View>

          {alergias.length > 0 ? (
            <View style={estilos.etiquetas}>
              {alergias.map((nome) => (
                <View key={nome} style={estilos.etiqueta}>
                  <Icone nome="check" cor={cores.primaria} tamanho={14} espessura={2.6} />
                  <Text style={estilos.etiquetaTexto}>{nome}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={estilos.vazio}>
              Nenhuma alergia marcada. Toque em Editar para escolher.
            </Text>
          )}

          <Text style={estilos.nota}>
            Usadas para avisar sobre registros no iNaturalist perto de você e nas trilhas.
          </Text>
        </View>

        <Botao titulo="Sair (provisório)" variante="secundario" onPress={sair} />
      </ScrollView>
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
    gap: 14,
  },
  cabecalho: {
    gap: espacos.xs,
    marginBottom: espacos.xs,
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
    lineHeight: 29,
    color: cores.primaria,
  },
  usuario: {
    fontFamily: fontes.regular,
    fontSize: 13,
    color: cores.textoSecundario,
  },
  cartao: {
    padding: espacos.lg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    gap: espacos.md,
  },
  cartaoTopo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  cartaoTitulo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 15,
    color: cores.primaria,
  },
  editar: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primariaMedia,
  },
  etiquetas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacos.sm,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: espacos.sm,
    paddingHorizontal: espacos.md,
    borderRadius: raios.md,
    backgroundColor: cores.selecionado,
  },
  etiquetaTexto: {
    fontFamily: fontes.semiNegrito,
    fontSize: 13,
    color: cores.primaria,
  },
  vazio: {
    fontFamily: fontes.regular,
    fontSize: 14,
    color: cores.textoSecundario,
  },
  nota: {
    fontFamily: fontes.regular,
    fontSize: 12,
    lineHeight: 18,
    color: cores.textoSecundario,
  },
});
