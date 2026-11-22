import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Carregando } from '@/components/Carregando';
import { Icone, type NomeIcone } from '@/components/Icone';
import { cores, fontes, raios } from '@/constants/tema';
import type { EstadoLocal } from '@/contexts/alertas';
import {
  DIAS_HISTORICO,
  formatarRaio,
  ROTULO_TIPO,
  type Local,
  type TipoLocal,
} from '@/services/locais';

export const ICONE_TIPO: Record<TipoLocal, NomeIcone> = {
  casa: 'casa',
  trabalho: 'maleta',
  trilha: 'caminhada',
  outro: 'pin',
};

type Props = {
  local: Local;
  estado: EstadoLocal | undefined;
  onPress: (local: Local) => void;
};

// Cor e texto do que há de novo: vermelho se tem peçonhento, amarelo se só alergia
export function resumoDoLocal(estado: EstadoLocal | undefined) {
  if (!estado || estado.tipo === 'carregando') {
    return { cor: cores.bordaForte, fundo: cores.selecionado, texto: 'Conferindo…', novos: 0 };
  }
  if (estado.tipo === 'erro') {
    return {
      cor: cores.erro,
      fundo: cores.erroFundo,
      texto: 'Não deu para conferir agora',
      novos: 0,
    };
  }
  const novos = estado.registros.filter((r) => r.novo);
  if (novos.length === 0) {
    const total = estado.registros.length;
    return {
      cor: cores.riscoBaixo,
      fundo: cores.selecionado,
      texto:
        total === 0
          ? `Nada novo · nada registrado em ${DIAS_HISTORICO} dias`
          : `Nada novo · ${total} ${total === 1 ? 'registro' : 'registros'} em ${DIAS_HISTORICO} dias`,
      novos: 0,
    };
  }
  const peconhentos = novos.filter((r) => r.peconhento).length;
  const alergias = novos.filter((r) => r.alergia).length;
  const partes = [
    peconhentos > 0 ? `${peconhentos} ${peconhentos === 1 ? 'peçonhento' : 'peçonhentos'}` : null,
    alergias > 0 ? `${alergias} ${alergias === 1 ? 'alergia' : 'alergias'}` : null,
  ].filter(Boolean);
  return {
    // Texto e ícone no tom escuro: o amarelo do risco some no fundo claro
    cor: peconhentos > 0 ? cores.perigoTexto : cores.avisoTexto,
    fundo: peconhentos > 0 ? cores.perigoFundo : cores.avisoFundo,
    texto: `${novos.length} ${novos.length === 1 ? 'novo' : 'novos'}: ${partes.join(' · ')}`,
    novos: novos.length,
  };
}

export function CartaoLocal({ local, estado, onPress }: Props) {
  const resumo = resumoDoLocal(estado);
  const detalhe = `${ROTULO_TIPO[local.tipo]} · a até ${formatarRaio(local.raioKm)}`;

  return (
    <Pressable
      onPress={() => onPress(local)}
      accessibilityRole="link"
      accessibilityLabel={`${local.nome}, ${detalhe}, ${resumo.texto}`}
      style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
      <View style={[estilos.icone, { backgroundColor: resumo.fundo }]}>
        <Icone nome={ICONE_TIPO[local.tipo]} cor={resumo.cor} tamanho={22} />
      </View>

      <View style={estilos.textos}>
        <Text style={estilos.nome} numberOfLines={1}>
          {local.nome}
        </Text>
        <Text style={estilos.detalhe} numberOfLines={1}>
          {detalhe}
        </Text>
        <View style={estilos.linhaStatus}>
          {estado?.tipo === 'carregando' ? (
            <Carregando tamanho="pequeno" corFundo={cores.superficie} />
          ) : (
            <View style={[estilos.bolinha, { backgroundColor: resumo.cor }]} />
          )}
          <Text
            style={[estilos.status, resumo.novos > 0 && { color: resumo.cor }]}
            numberOfLines={1}>
            {resumo.texto}
          </Text>
        </View>
      </View>

      {resumo.novos > 0 && (
        <View style={[estilos.contador, { backgroundColor: resumo.cor }]}>
          <Text style={estilos.contadorTexto}>{resumo.novos}</Text>
        </View>
      )}
      <Icone nome="avancar" cor={cores.bordaForte} tamanho={18} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: raios.lg,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  pressionado: {
    opacity: 0.85,
  },
  icone: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  nome: {
    fontFamily: fontes.negrito,
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  linhaStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  bolinha: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  status: {
    flexShrink: 1,
    fontFamily: fontes.semiNegrito,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  contador: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 7,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    fontFamily: fontes.negrito,
    fontSize: 12,
    color: cores.superficie,
  },
});
