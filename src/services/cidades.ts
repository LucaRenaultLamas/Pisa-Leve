import AsyncStorage from '@react-native-async-storage/async-storage';

import { CENTRO_JF, TRILHAS_JF } from '@/constants/trilhasJF';
import type { Coordenadas } from '@/services/localizacao';
import { buscarMunicipio, buscarTrilhasNaRegiao, type TrilhaNaRegiao } from '@/services/nominatim';
import { areaEmVolta, dentroDaArea, type Area } from '@/services/trilhas';
import { distanciaKm } from '@/utils/geo';

// v3: cidades achadas a partir das trilhas (antes: vizinhas do iNaturalist conferidas uma a uma)
const CHAVE_SALVAS = '@pisa-leve/cidades-com-trilhas-v3';
const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;
const MUDOU_LUGAR_KM = 5;
// Em volta de JF quase nenhuma vizinha tem trilha: a região cresce até achar as 5
const RAIOS_KM = [25, 55, 110, 165];

export type Cidade = {
  id: number;
  nome: string;
  uf: string | null;
  centro: Coordenadas;
  area: Area;
  distanciaKm: number; // até a trilha mais perto dela; 0 = você está dentro dela
};

// Reserva se o Nominatim não responder; tem as trilhas da lista fixa
export const CIDADE_JF: Cidade = {
  id: 22067,
  nome: 'Juiz de Fora',
  uf: 'MG',
  centro: CENTRO_JF,
  area: { sul: -21.99959, oeste: -43.68613, norte: -21.52096, leste: -43.14764 },
  distanciaKm: 0,
};

type Salvas = { ponto: Coordenadas; salvoEm: number; cidades: Cidade[] };

async function lerSalvas(ponto: Coordenadas, quantas: number) {
  try {
    const texto = await AsyncStorage.getItem(CHAVE_SALVAS);
    const salvas = texto ? (JSON.parse(texto) as Salvas) : null;
    if (
      salvas &&
      Date.now() - salvas.salvoEm < VALIDADE_MS &&
      distanciaKm(salvas.ponto, ponto) < MUDOU_LUGAR_KM &&
      salvas.cidades.length >= quantas
    ) {
      return salvas.cidades.slice(0, quantas);
    }
  } catch {
    // Lista salva estragada: busca de novo
  }
  return null;
}

type Achada = { municipio: string; estado: string | null; uf: string | null; distanciaKm: number };

// Junta as trilhas por município, cada um com a distância da trilha mais perto de você
function porMunicipio(trilhas: TrilhaNaRegiao[], ponto: Coordenadas) {
  const mapa = new Map<string, Achada>();
  for (const t of trilhas) {
    const chave = `${t.municipio}|${t.uf}`;
    const distancia = distanciaKm(ponto, t.ponto);
    const atual = mapa.get(chave);
    if (!atual || distancia < atual.distanciaKm) {
      mapa.set(chave, {
        municipio: t.municipio,
        estado: t.estado,
        uf: t.uf,
        distanciaKm: distancia,
      });
    }
  }
  return [...mapa.values()].sort((a, b) => a.distanciaKm - b.distanciaKm);
}

// As trilhas da lista fixa contam como trilhas de JF
function trilhasFixasNaRegiao(area: Area): TrilhaNaRegiao[] {
  return TRILHAS_JF.filter((t) => dentroDaArea(t.inicio, area)).map((t) => ({
    municipio: 'Juiz de Fora',
    estado: 'Minas Gerais',
    uf: 'MG',
    ponto: t.inicio,
  }));
}

async function paraCidade(achada: Achada, ponto: Coordenadas): Promise<Cidade | null> {
  if (achada.municipio === 'Juiz de Fora' && achada.uf === 'MG') {
    return {
      ...CIDADE_JF,
      distanciaKm: dentroDaArea(ponto, CIDADE_JF.area) ? 0 : achada.distanciaKm,
    };
  }
  const municipio = await buscarMunicipio(achada.municipio, achada.estado, achada.uf).catch(
    () => null,
  );
  if (!municipio) return null;
  return {
    ...municipio,
    distanciaKm: dentroDaArea(ponto, municipio.area) ? 0 : achada.distanciaKm,
  };
}

const ordenar = (cidades: Cidade[]) => [...cidades].sort((a, b) => a.distanciaKm - b.distanciaKm);

// Uma procura por vez: a pré-busca ao abrir e a aba Trilhas usam a mesma
let emAndamento: {
  ponto: Coordenadas;
  promessa: Promise<Cidade[]>;
  ouvintes: Set<(cidades: Cidade[]) => void>;
  parciais: Cidade[];
} | null = null;

// As `quantas` cidades mais perto de você que têm trilha mapeada. Procura trilhas numa região
// que vai crescendo e vê de que município é cada uma. aoAchar recebe a lista a cada cidade nova
export function buscarCidadesComTrilhas(
  ponto: Coordenadas,
  quantas = 5,
  aoAchar?: (cidades: Cidade[]) => void,
): Promise<Cidade[]> {
  if (emAndamento && distanciaKm(emAndamento.ponto, ponto) < MUDOU_LUGAR_KM) {
    const andamento = emAndamento;
    if (aoAchar) {
      andamento.ouvintes.add(aoAchar);
      if (andamento.parciais.length > 0) aoAchar(andamento.parciais);
    }
    return andamento.promessa.finally(() => aoAchar && andamento.ouvintes.delete(aoAchar));
  }

  const ouvintes = new Set<(cidades: Cidade[]) => void>(aoAchar ? [aoAchar] : []);
  const andamento = {
    ponto,
    ouvintes,
    parciais: [] as Cidade[],
    promessa: undefined as unknown as Promise<Cidade[]>,
  };
  andamento.promessa = procurar();
  emAndamento = andamento;
  andamento.promessa.finally(() => {
    if (emAndamento === andamento) emAndamento = null;
  });
  return andamento.promessa;

  async function procurar() {
    const salvas = await lerSalvas(ponto, quantas);
    if (salvas) return salvas;

    const trilhas: TrilhaNaRegiao[] = [];
    const cidades: Cidade[] = [];
    const resolvidas = new Set<string>();
    let algumaResposta = false;

    for (const raioKm of RAIOS_KM) {
      const area = areaEmVolta(ponto, raioKm);
      const novas = await buscarTrilhasNaRegiao(area).catch(() => null);
      if (novas) algumaResposta = true;
      trilhas.push(...(novas ?? []), ...trilhasFixasNaRegiao(area));

      // Só as mais perto entram; as de fora do raio desta volta podem perder pra uma mais perto
      const candidatas = porMunicipio(trilhas, ponto).filter((a) => a.distanciaKm <= raioKm);
      for (const achada of candidatas) {
        if (cidades.length === quantas) break;
        const chave = `${achada.municipio}|${achada.uf}`;
        if (resolvidas.has(chave)) continue;
        resolvidas.add(chave);
        const cidade = await paraCidade(achada, ponto);
        if (!cidade || cidades.some((c) => c.id === cidade.id)) continue;
        cidades.push(cidade);
        andamento.parciais = ordenar(cidades);
        ouvintes.forEach((ouvir) => ouvir(andamento.parciais));
      }
      if (cidades.length === quantas) break;
    }

    if (!algumaResposta && cidades.length === 0) throw new Error('Nominatim fora do ar');
    const final = ordenar(cidades);
    // Só guarda lista completa: incompleta tenta de novo na próxima vez
    if (final.length === quantas) {
      const dados: Salvas = { ponto, salvoEm: Date.now(), cidades: final };
      AsyncStorage.setItem(CHAVE_SALVAS, JSON.stringify(dados)).catch(() => {});
    }
    return final;
  }
}
