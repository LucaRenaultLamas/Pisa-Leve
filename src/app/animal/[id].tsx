import { useLocalSearchParams } from 'expo-router';

import { EmConstrucao } from '@/components/EmConstrucao';

export default function AnimalDetalhe() {
  // O [id] do nome do arquivo chega aqui como parâmetro da rota.
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmConstrucao numero={6} titulo="Detalhe do animal" rota={`/animal/${id}`} />;
}
