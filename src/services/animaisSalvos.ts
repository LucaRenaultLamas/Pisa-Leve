import AsyncStorage from '@react-native-async-storage/async-storage';

// Guarda o básico do animal: a lista de salvos abre sem internet
export type AnimalSalvo = {
  taxonId: number;
  nome: string;
  nomeCientifico: string;
  foto: string | null;
  peconhento: boolean;
  salvoEm: number;
};

const chave = (usuario: string) => `@pisa-leve/animais-salvos/${usuario}`;

export async function lerAnimaisSalvos(usuario: string): Promise<AnimalSalvo[]> {
  const texto = await AsyncStorage.getItem(chave(usuario));
  return texto ? (JSON.parse(texto) as AnimalSalvo[]) : [];
}

export async function guardarAnimaisSalvos(usuario: string, animais: AnimalSalvo[]) {
  await AsyncStorage.setItem(chave(usuario), JSON.stringify(animais));
}
