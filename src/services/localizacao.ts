import * as Location from 'expo-location';

export type Coordenadas = {
  latitude: number;
  longitude: number;
};

export class ErroLocalizacao extends Error {
  // false = só liberando nas configurações do aparelho
  podePedirDeNovo: boolean;

  constructor(mensagem: string, podePedirDeNovo = true) {
    super(mensagem);
    this.name = 'ErroLocalizacao';
    this.podePedirDeNovo = podePedirDeNovo;
  }
}

export async function pegarLocalizacaoAtual(): Promise<Coordenadas> {
  const permissao = await Location.requestForegroundPermissionsAsync();

  if (permissao.status !== 'granted') {
    throw new ErroLocalizacao(
      permissao.canAskAgain
        ? 'Precisamos da sua localização para mostrar o que está por perto.'
        : 'A localização está bloqueada para o Pisa Leve. Libere nas configurações do aparelho.',
      permissao.canAskAgain,
    );
  }

  try {
    const posicao = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { latitude: posicao.coords.latitude, longitude: posicao.coords.longitude };
  } catch {
    // GPS sem sinal: tenta a última posição conhecida (na web não tem)
    const ultima = await Location.getLastKnownPositionAsync().catch(() => null);
    if (ultima) {
      return { latitude: ultima.coords.latitude, longitude: ultima.coords.longitude };
    }
    throw new ErroLocalizacao('Não deu para achar sua localização. Confira se o GPS está ligado.');
  }
}

// Avisa quando a pessoa anda; devolve a função que para de acompanhar
export async function acompanharLocalizacao(
  aoMudar: (centro: Coordenadas) => void,
  metros: number,
): Promise<() => void> {
  const assinatura = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.Balanced, distanceInterval: metros },
    (posicao) =>
      aoMudar({ latitude: posicao.coords.latitude, longitude: posicao.coords.longitude }),
  );
  return () => assinatura.remove();
}
