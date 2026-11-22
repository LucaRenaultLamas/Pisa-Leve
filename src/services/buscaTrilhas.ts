import { buscarCidadesComTrilhas } from '@/services/cidades';
import { pegarLocalizacaoAtual, type Coordenadas } from '@/services/localizacao';
import { buscarTrilhasRapido } from '@/services/nominatim';
import { buscarTrilhasOsm } from '@/services/overpass';
import { calcularRisco } from '@/services/risco';
import {
  areaEmVolta,
  juntarTrilhas,
  lerTrilhasOsmSalvas,
  trilhasFixas,
  type Area,
  type Trilha,
} from '@/services/trilhas';

export const RAIO_PERTO_KM = 15;
// Trilha quase não muda e a Overpass é lenta (~30 s): lista salva vale uma semana
export const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const RISCO_ADIANTADO = 8; // trilhas mais perto que já saem com o risco calculado

export type AlvoBusca = {
  chave: string; // nome da lista salva no aparelho
  area: Area;
  referencia: Coordenadas;
  raioKm: number | null;
};

export function alvoPerto(voce: Coordenadas): AlvoBusca {
  return {
    // ~1 km de folga: andar um pouco não joga a lista salva fora
    chave: `perto-${voce.latitude.toFixed(2)},${voce.longitude.toFixed(2)}`,
    area: areaEmVolta(voce, RAIO_PERTO_KM + 2),
    referencia: voce,
    raioKm: RAIO_PERTO_KM,
  };
}

export type BuscaTrilhas = {
  rapidas: Trilha[] | null; // o que a busca rápida já achou
  completa: Promise<Trilha[]>; // Overpass; quando resolve, a lista já está salva
  ouvir: (aoAchar: (rapidas: Trilha[]) => void) => () => void;
};

const emAndamento = new Map<string, BuscaTrilhas>();

// Uma busca por lugar de cada vez: o app começa ao abrir e a aba Trilhas pega a mesma
export function buscarTrilhas(alvo: AlvoBusca, comRapida: boolean): BuscaTrilhas {
  const existente = emAndamento.get(alvo.chave);
  if (existente) return existente;

  const ouvintes = new Set<(rapidas: Trilha[]) => void>();
  let completaChegou = false;
  const busca: BuscaTrilhas = {
    rapidas: null,
    completa: buscarTrilhasOsm(alvo).finally(() => {
      completaChegou = true;
      emAndamento.delete(alvo.chave);
    }),
    ouvir(aoAchar) {
      ouvintes.add(aoAchar);
      if (busca.rapidas) aoAchar(busca.rapidas);
      return () => ouvintes.delete(aoAchar);
    },
  };

  if (comRapida) {
    const avisar = (rapidas: Trilha[]) => {
      if (completaChegou) return;
      busca.rapidas = rapidas;
      ouvintes.forEach((aoAchar) => aoAchar(rapidas));
    };
    buscarTrilhasRapido({ ...alvo, aoAchar: avisar })
      .then(avisar)
      .catch(() => {});
  }

  emAndamento.set(alvo.chave, busca);
  return busca;
}

// Ao abrir o app: trilhas perto, risco das mais próximas e cidades com trilha, sem tela esperando
export async function preCarregarTrilhas(taxonsAlergia: number[]) {
  let voce: Coordenadas;
  try {
    voce = await pegarLocalizacaoAtual();
  } catch {
    return; // sem localização, a aba Trilhas resolve quando abrir
  }

  const alvo = alvoPerto(voce);
  const fixas = trilhasFixas(alvo.area, voce, RAIO_PERTO_KM);
  // calcularRisco guarda a promessa: a aba Trilhas reaproveita o que já foi pedido aqui
  const adiantarRisco = (osm: Trilha[]) =>
    juntarTrilhas(osm, fixas)
      .slice(0, RISCO_ADIANTADO)
      .forEach((t) => calcularRisco(t, taxonsAlergia).catch(() => {}));

  const salvas = await lerTrilhasOsmSalvas(alvo.chave, voce);
  adiantarRisco(salvas?.trilhas ?? []);
  // Chips de cidade da aba: só as vizinhas com trilha (fila do Nominatim, depois das trilhas)
  buscarCidadesComTrilhas(voce).catch(() => {});
  if (salvas && Date.now() - salvas.salvoEm < VALIDADE_MS) return;

  const busca = buscarTrilhas(alvo, !salvas);
  busca.ouvir(adiantarRisco);
  const completas = await busca.completa.catch(() => null);
  if (completas) adiantarRisco(completas);
}
