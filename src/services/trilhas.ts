import AsyncStorage from '@react-native-async-storage/async-storage';

import { TRILHAS_JF } from '@/constants/trilhasJF';
import type { Coordenadas } from '@/services/localizacao';
import { distanciaKm } from '@/utils/geo';

// v4: a busca passou a pegar caminhos com nome de trilha; listas antigas são ignoradas
const PREFIXO_SALVAS = '@pisa-leve/trilhas-v4/';

export type Trilha = {
  id: string; // número da relação no OSM, ou "jf-..." da lista fixa
  origem: 'osm' | 'jf';
  nome: string;
  de: string | null;
  para: string | null;
  descricao: string | null;
  trechos: Coordenadas[][]; // vazio na lista fixa: só tem o ponto de início
  inicio: Coordenadas;
  comprimentoKm: number | null;
  rotaLonga: boolean; // passa da área buscada, então o comprimento não é o total
  distanciaKm: number; // até o ponto da trilha mais perto da referência
};

export type Area = { sul: number; oeste: number; norte: number; leste: number };

export function areaEmVolta(centro: Coordenadas, raioKm: number): Area {
  const dLat = raioKm / 111.32;
  const dLon = raioKm / (111.32 * Math.cos((centro.latitude * Math.PI) / 180));
  return {
    sul: centro.latitude - dLat,
    oeste: centro.longitude - dLon,
    norte: centro.latitude + dLat,
    leste: centro.longitude + dLon,
  };
}

export function dentroDaArea(p: Coordenadas, area: Area) {
  return (
    p.latitude >= area.sul &&
    p.latitude <= area.norte &&
    p.longitude >= area.oeste &&
    p.longitude <= area.leste
  );
}

export function pontoMaisPerto(centro: Coordenadas, trilha: Pick<Trilha, 'trechos' | 'inicio'>) {
  let menor = distanciaKm(centro, trilha.inicio);
  for (const trecho of trilha.trechos) {
    for (const p of trecho) menor = Math.min(menor, distanciaKm(centro, p));
  }
  return menor;
}

// Da lista fixa, as que começam dentro da área (e do raio, no "perto de mim")
export function trilhasFixas(area: Area, referencia: Coordenadas, raioKm: number | null): Trilha[] {
  return TRILHAS_JF.map((t): Trilha => ({
    ...t,
    origem: 'jf',
    trechos: [],
    rotaLonga: false,
    distanciaKm: distanciaKm(referencia, t.inicio),
  })).filter((t) => dentroDaArea(t.inicio, area) && (raioKm === null || t.distanciaKm <= raioKm));
}

// Junta as duas listas; se o OSM tiver uma com o mesmo nome, fica a do OSM (tem o desenho)
export function juntarTrilhas(osm: Trilha[], fixas: Trilha[]) {
  const nomes = new Set(osm.map((t) => t.nome.toLowerCase()));
  return [...osm, ...fixas.filter((t) => !nomes.has(t.nome.toLowerCase()))].sort(
    (a, b) => a.distanciaKm - b.distanciaKm,
  );
}

type Salvas = { salvoEm: number; trilhas: Trilha[] };

export async function salvarTrilhasOsm(chave: string, trilhas: Trilha[]) {
  const dados: Salvas = { salvoEm: Date.now(), trilhas };
  // Cache é bônus: se falhar ao salvar, segue a vida
  await AsyncStorage.setItem(PREFIXO_SALVAS + chave, JSON.stringify(dados)).catch(() => {});
}

// Distâncias recalculadas a partir da referência de agora
export async function lerTrilhasOsmSalvas(chave: string, referencia: Coordenadas) {
  try {
    const texto = await AsyncStorage.getItem(PREFIXO_SALVAS + chave);
    if (!texto) return null;
    const salvas = JSON.parse(texto) as Salvas;
    return {
      salvoEm: salvas.salvoEm,
      trilhas: salvas.trilhas.map((t) => ({ ...t, distanciaKm: pontoMaisPerto(referencia, t) })),
    };
  } catch {
    return null;
  }
}

// A lista guarda aqui a trilha tocada, pro detalhe abrir sem buscar de novo
const abertas = new Map<string, Trilha>();

export function lembrarTrilha(trilha: Trilha) {
  abertas.set(trilha.id, trilha);
}

// Página recarregada no detalhe: procura na lista fixa e nas listas salvas do OSM
export async function acharTrilha(id: string): Promise<Trilha | null> {
  const lembrada = abertas.get(id);
  if (lembrada) return lembrada;

  const fixa = TRILHAS_JF.find((t) => t.id === id);
  if (fixa) {
    return { ...fixa, origem: 'jf', trechos: [], rotaLonga: false, distanciaKm: 0 };
  }

  try {
    const chaves = (await AsyncStorage.getAllKeys()).filter((c) => c.startsWith(PREFIXO_SALVAS));
    for (const [, texto] of await AsyncStorage.multiGet(chaves)) {
      if (!texto) continue;
      const achada = (JSON.parse(texto) as Salvas).trilhas.find((t) => t.id === id);
      if (achada) return achada;
    }
  } catch {
    // Sem lista salva legível: cai no "não encontrada"
  }
  return null;
}
