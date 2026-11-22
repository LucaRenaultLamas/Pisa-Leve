import AsyncStorage from '@react-native-async-storage/async-storage';

export type PerfilAlergias = {
  selecionadas: string[]; // ids de gruposDeAlergias
  outras: string[]; // o que a pessoa digitou em "Adicionar outra alergia"
  atualizadoEm: string;
};

// Um perfil por conta, no próprio aparelho
const chave = (usuario: string) => `@pisa-leve/alergias/${usuario}`;

export async function lerPerfilAlergias(usuario: string): Promise<PerfilAlergias | null> {
  const texto = await AsyncStorage.getItem(chave(usuario));
  return texto ? (JSON.parse(texto) as PerfilAlergias) : null;
}

export async function salvarPerfilAlergias(
  usuario: string,
  dados: Omit<PerfilAlergias, 'atualizadoEm'>,
): Promise<PerfilAlergias> {
  const perfil: PerfilAlergias = { ...dados, atualizadoEm: new Date().toISOString() };
  await AsyncStorage.setItem(chave(usuario), JSON.stringify(perfil));
  return perfil;
}
