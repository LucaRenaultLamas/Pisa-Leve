import { useState, type Ref } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputInstance,
  type TextInputProps,
} from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, espacos, fontes, raios } from '@/constants/tema';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  rotulo: string;
  erro?: string | boolean;
  ajuda?: string;
  valido?: boolean;
  icone?: NomeIcone;
  prefixo?: string;
  senha?: boolean;
  ref?: Ref<TextInputInstance>;
};

export function CampoTexto({
  rotulo,
  erro,
  ajuda,
  valido = false,
  icone,
  prefixo,
  senha = false,
  ref,
  style,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focado, setFocado] = useState(false);
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const temErro = !!erro;
  // respiro lateral só quando tem ícone do lado
  const temAlgoAEsquerda = !!icone || !!prefixo;
  const temAlgoADireita = senha || (valido && !temErro);

  return (
    <View style={estilos.container}>
      <Text style={estilos.rotulo}>{rotulo}</Text>

      <View
        style={[
          estilos.caixa,
          temAlgoAEsquerda && estilos.caixaComIconeEsquerda,
          temAlgoADireita && estilos.caixaComIconeDireita,
          senha && estilos.caixaComBotao,
          focado && estilos.caixaFocada,
          temErro && estilos.caixaComErro,
        ]}>
        {icone && <Icone nome={icone} cor={cores.textoSecundario} />}
        {prefixo && <Text style={estilos.prefixo}>{prefixo}</Text>}

        <TextInput
          ref={ref}
          placeholderTextColor={cores.bordaForte}
          secureTextEntry={senha && !senhaVisivel}
          autoCorrect={senha ? false : undefined}
          style={[
            estilos.campo,
            !temAlgoAEsquerda && estilos.campoRespiroEsquerda,
            !temAlgoADireita && estilos.campoRespiroDireita,
            style,
          ]}
          onFocus={(e) => {
            setFocado(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocado(false);
            onBlur?.(e);
          }}
          accessibilityLabel={rotulo}
          {...props}
        />

        {valido && !temErro && (
          <Icone nome="check" cor={cores.primariaMedia} />
        )}

        {senha && (
          <Pressable
            onPress={() => setSenhaVisivel((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={senhaVisivel ? 'Esconder senha' : 'Mostrar senha'}
            style={estilos.botaoOlho}>
            <Icone nome={senhaVisivel ? 'olhoFechado' : 'olho'} cor={cores.textoSecundario} />
          </Pressable>
        )}
      </View>

      {typeof erro === 'string' && erro ? (
        <View style={estilos.linhaMensagem}>
          <Icone nome="alerta" cor={cores.erro} tamanho={14} />
          <Text style={estilos.erro}>{erro}</Text>
        </View>
      ) : (
        !!ajuda && <Text style={[estilos.ajuda, valido && estilos.ajudaValida]}>{ajuda}</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    gap: espacos.sm,
  },
  rotulo: {
    fontFamily: fontes.semiNegrito,
    fontSize: 14,
    color: cores.texto,
  },
  caixa: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: raios.campo,
    borderWidth: 1.5,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
    overflow: 'hidden', // nada passa dos cantos arredondados
  },
  caixaComIconeEsquerda: {
    paddingLeft: 14,
  },
  caixaComIconeDireita: {
    paddingRight: 14,
  },
  caixaComBotao: {
    paddingRight: 6,
  },
  caixaFocada: {
    borderColor: cores.primariaMedia,
  },
  caixaComErro: {
    borderColor: cores.erro,
  },
  prefixo: {
    fontFamily: fontes.monoNegrito,
    fontSize: 16,
    color: cores.textoSecundario,
    marginRight: -4,
  },
  campo: {
    flex: 1,
    minWidth: 0,
    alignSelf: 'stretch',
    height: '100%',
    // raio da caixa menos a borda
    borderRadius: raios.campo - 1.5,
    borderWidth: 0,
    backgroundColor: 'transparent',
    fontFamily: fontes.regular,
    fontSize: 16,
    color: cores.texto,
    outlineWidth: 0,
    ...Platform.select({
      // esconde o fundo do autopreencher do Chrome
      web: { boxShadow: `inset 0 0 0 1000px ${cores.superficie}` },
    }),
  },
  campoRespiroEsquerda: {
    paddingLeft: 14,
  },
  campoRespiroDireita: {
    paddingRight: 14,
  },
  botaoOlho: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  linhaMensagem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  erro: {
    flex: 1,
    fontFamily: fontes.semiNegrito,
    fontSize: 12,
    color: cores.erro,
  },
  ajuda: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  ajudaValida: {
    fontFamily: fontes.semiNegrito,
    color: cores.primariaMedia,
  },
});
