import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icone, type NomeIcone } from '@/components/Icone';
import { MiniTrilha } from '@/components/MiniTrilha';
import { cores, fontes } from '@/constants/tema';
import type { NivelRisco, RiscoTrilha } from '@/services/risco';
import type { Trilha } from '@/services/trilhas';
import { formatarDistancia } from '@/utils/geo';

type Props = {
  trilha: Trilha;
  // De onde conta a distância; null = não mostra
  referencia: 'voce' | 'centro' | null;
  // undefined = calculando; null = não deu para calcular
  risco: RiscoTrilha | null | undefined;
  favorita: boolean;
  onAbrir: (trilha: Trilha) => void;
  onFavoritar: (trilha: Trilha) => void;
};

export const ETIQUETA: Record<
  NivelRisco,
  { texto: string; fundo: string; cor: string; icone: NomeIcone }
> = {
  alto: { texto: 'Risco alto', fundo: cores.perigoFundo, cor: cores.perigoTexto, icone: 'alerta' },
  medio: { texto: 'Risco médio', fundo: cores.avisoFundo, cor: cores.avisoTexto, icone: 'alerta' },
  baixo: { texto: 'Risco baixo', fundo: cores.selecionado, cor: cores.primaria, icone: 'escudo' },
};

function textoDistancia(km: number, referencia: 'voce' | 'centro') {
  // Menos de 50 m = a trilha passa pelo ponto de referência
  if (km < 0.05) return referencia === 'voce' ? 'você está nela' : 'no centro';
  return `a ${formatarDistancia(km)} ${referencia === 'voce' ? 'de você' : 'do centro'}`;
}

export function textoRegistros({ alergias, peconhentos }: RiscoTrilha) {
  if (alergias === 0 && peconhentos === 0) return 'Sem registros recentes';
  const partes = [];
  if (alergias > 0) partes.push(`${alergias} ${alergias === 1 ? 'alergia' : 'alergias'}`);
  if (peconhentos > 0) {
    partes.push(`${peconhentos} ${peconhentos === 1 ? 'peçonhento' : 'peçonhentos'}`);
  }
  return partes.join(' · ');
}

// memo: digitar na busca não redesenha os cartões que não mudaram
export const CartaoTrilha = memo(function CartaoTrilha({
  trilha,
  referencia,
  risco,
  favorita,
  onAbrir,
  onFavoritar,
}: Props) {
  const { nome, comprimentoKm, rotaLonga, distanciaKm } = trilha;
  const tamanho =
    comprimentoKm !== null ? formatarDistancia(comprimentoKm) : rotaLonga ? 'Rota longa' : null;
  const detalhe = [tamanho, referencia && textoDistancia(distanciaKm, referencia)]
    .filter(Boolean)
    .join(' · ');
  const etiqueta = risco ? ETIQUETA[risco.nivel] : null;

  return (
    <View style={estilos.cartao}>
      <Pressable
        onPress={() => onAbrir(trilha)}
        accessibilityRole="link"
        accessibilityLabel={[
          nome,
          detalhe,
          etiqueta?.texto,
          risco ? textoRegistros(risco) : 'risco ainda sendo calculado',
        ]
          .filter(Boolean)
          .join(', ')}
        style={({ pressed }) => [estilos.principal, pressed && estilos.pressionado]}>
        <MiniTrilha trechos={trilha.trechos} inicio={trilha.inicio} risco={risco} />

        <View style={estilos.textos}>
          <Text style={estilos.nome} numberOfLines={2}>
            {nome}
          </Text>
          {!!detalhe && <Text style={estilos.detalhe}>{detalhe}</Text>}

          {risco === undefined ? (
            <View style={estilos.calculando}>
              <ActivityIndicator size="small" color={cores.textoSecundario} />
              <Text style={estilos.detalhe}>Calculando risco…</Text>
            </View>
          ) : risco === null ? (
            <Text style={estilos.detalhe}>Risco indisponível agora</Text>
          ) : (
            <>
              <View style={[estilos.etiqueta, { backgroundColor: etiqueta!.fundo }]}>
                <Icone nome={etiqueta!.icone} cor={etiqueta!.cor} tamanho={13} />
                <Text style={[estilos.etiquetaTexto, { color: etiqueta!.cor }]}>
                  {etiqueta!.texto}
                </Text>
              </View>
              <Text style={estilos.detalhe}>{textoRegistros(risco)}</Text>
            </>
          )}
        </View>
      </Pressable>

      <Pressable
        onPress={() => onFavoritar(trilha)}
        accessibilityRole="button"
        accessibilityState={{ selected: favorita }}
        accessibilityLabel={favorita ? `Tirar ${nome} das favoritas` : `Favoritar ${nome}`}
        hitSlop={6}
        style={({ pressed }) => [estilos.coracao, pressed && estilos.pressionado]}>
        <Icone
          nome={favorita ? 'coracaoCheio' : 'coracao'}
          cor={favorita ? cores.erro : cores.textoSecundario}
          tamanho={22}
        />
      </Pressable>
    </View>
  );
});

const estilos = StyleSheet.create({
  cartao: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: cores.borda,
    backgroundColor: cores.superficie,
  },
  principal: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
  },
  pressionado: {
    opacity: 0.7,
  },
  textos: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  nome: {
    fontFamily: fontes.semiNegrito,
    fontSize: 15,
    color: cores.texto,
  },
  detalhe: {
    fontFamily: fontes.regular,
    fontSize: 12,
    color: cores.textoSecundario,
  },
  calculando: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  etiqueta: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 10,
  },
  etiquetaTexto: {
    fontFamily: fontes.negrito,
    fontSize: 11,
  },
  coracao: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    marginRight: 2,
  },
});
