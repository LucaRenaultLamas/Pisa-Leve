import { StyleSheet, Text, View } from 'react-native';

import { Icone } from '@/components/Icone';
import { cores, espacos, fontes } from '@/constants/tema';
import { conferirSenha, forcaDaSenha } from '@/utils/validacao';

export function ForcaSenha({ senha }: { senha: string }) {
  const forca = forcaDaSenha(senha);
  const regras = conferirSenha(senha);

  return (
    <View style={estilos.container}>
      <View style={estilos.barra} accessibilityLabel={`Força da senha: ${forca} de 3`}>
        {[1, 2, 3].map((n) => (
          <View key={n} style={[estilos.segmento, n <= forca && estilos.segmentoCheio]} />
        ))}
      </View>
      <Regra ok={regras.tamanho} texto="Pelo menos 8 caracteres" />
      <Regra ok={regras.letrasENumeros} texto="Letras e números" />
    </View>
  );
}

function Regra({ ok, texto }: { ok: boolean; texto: string }) {
  return (
    <View style={estilos.regra}>
      {ok ? (
        <Icone nome="check" cor={cores.primariaMedia} tamanho={14} espessura={3} />
      ) : (
        <View style={estilos.ponto} />
      )}
      <Text style={[estilos.textoRegra, ok && estilos.textoRegraOk]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    gap: espacos.xs,
  },
  barra: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  segmento: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: cores.borda,
  },
  segmentoCheio: {
    backgroundColor: cores.primariaMedia,
  },
  regra: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ponto: {
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: cores.bordaForte,
  },
  textoRegra: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  textoRegraOk: {
    fontFamily: fontes.semiNegrito,
    color: cores.primariaMedia,
  },
});
