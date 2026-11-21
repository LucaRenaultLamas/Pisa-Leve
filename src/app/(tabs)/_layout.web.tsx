import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes } from '@/constants/tema';
import { useAlertas } from '@/contexts/alertas';
import { useAoEntrar } from '@/hooks/useAoEntrar';

// Na web o NativeTabs só mostra o texto: aqui a barra é montada com os ícones do app
const ABAS = [
  { nome: 'index', href: '/', rotulo: 'Explorar', icone: 'mapa', ativo: 'mapaCheio' },
  {
    nome: 'trilhas',
    href: '/trilhas',
    rotulo: 'Trilhas',
    icone: 'caminhada',
    ativo: 'caminhadaCheia',
  },
  { nome: 'busca', href: '/busca', rotulo: 'Buscar', icone: 'busca', ativo: 'buscaCheia' },
  { nome: 'alertas', href: '/alertas', rotulo: 'Alertas', icone: 'sino', ativo: 'sinoCheio' },
  { nome: 'perfil', href: '/perfil', rotulo: 'Perfil', icone: 'usuario', ativo: 'usuarioCheio' },
] as const satisfies {
  nome: string;
  href: string;
  rotulo: string;
  icone: NomeIcone;
  ativo: NomeIcone;
}[];

export default function TabsLayoutWeb() {
  useAoEntrar();
  const margens = useSafeAreaInsets();
  const { totalNovos } = useAlertas();

  return (
    <Tabs style={estilos.tela}>
      <TabSlot style={estilos.conteudo} />
      <TabList style={[estilos.barra, { paddingBottom: 6 + margens.bottom }]}>
        {ABAS.map((aba) => (
          <TabTrigger key={aba.nome} name={aba.nome} href={aba.href} asChild>
            <BotaoAba
              rotulo={aba.rotulo}
              icone={aba.icone}
              iconeAtivo={aba.ativo}
              contador={aba.nome === 'alertas' ? totalNovos : 0}
            />
          </TabTrigger>
        ))}
      </TabList>
    </Tabs>
  );
}

type PropsBotao = Omit<TabTriggerSlotProps, 'ref'> & {
  rotulo: string;
  icone: NomeIcone;
  iconeAtivo: NomeIcone;
  contador: number;
};

function BotaoAba({ rotulo, icone, iconeAtivo, contador, isFocused, ...props }: PropsBotao) {
  const cor = isFocused ? cores.primaria : cores.textoSecundario;
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: !!isFocused }}
      accessibilityLabel={contador > 0 ? `${rotulo}, ${contador} novos` : rotulo}
      style={({ pressed }) => [estilos.aba, pressed && { opacity: 0.7 }]}>
      <View style={[estilos.indicador, isFocused && estilos.indicadorAtivo]}>
        <Icone nome={isFocused ? iconeAtivo : icone} cor={cor} tamanho={22} />
        {contador > 0 && (
          <View style={estilos.contador}>
            <Text style={estilos.contadorTexto}>{contador > 99 ? '99+' : contador}</Text>
          </View>
        )}
      </View>
      <Text style={[estilos.rotulo, { color: cor }, isFocused && estilos.rotuloAtivo]}>
        {rotulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
  },
  conteudo: {
    flex: 1,
    minHeight: 0,
  },
  barra: {
    flexDirection: 'row',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  aba: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 2,
  },
  indicador: {
    width: 56,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicadorAtivo: {
    backgroundColor: cores.selecionado,
  },
  contador: {
    position: 'absolute',
    top: -2,
    left: 30,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cores.erro,
    borderWidth: 2,
    borderColor: cores.superficie,
  },
  contadorTexto: {
    fontFamily: fontes.negrito,
    fontSize: 10,
    lineHeight: 12,
    color: cores.superficie,
  },
  rotulo: {
    fontFamily: fontes.media,
    fontSize: 12,
  },
  rotuloAtivo: {
    fontFamily: fontes.semiNegrito,
  },
});
