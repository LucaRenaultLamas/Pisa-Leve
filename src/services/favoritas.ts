import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trilha } from '@/services/trilhas';

// Guarda a trilha inteira: a aba Favoritas abre sem internet
const chave = (usuario: string) => `@pisa-leve/favoritas/${usuario}`;

export async function lerFavoritas(usuario: string): Promise<Trilha[]> {
  const texto = await AsyncStorage.getItem(chave(usuario));
  return texto ? (JSON.parse(texto) as Trilha[]) : [];
}

export async function salvarFavoritas(usuario: string, trilhas: Trilha[]) {
  await AsyncStorage.setItem(chave(usuario), JSON.stringify(trilhas));
}
