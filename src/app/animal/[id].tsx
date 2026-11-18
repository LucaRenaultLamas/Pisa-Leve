import { useLocalSearchParams } from 'expo-router';

import { EmConstrucao } from '@/components/EmConstrucao';

export default function AnimalDetalhe() {
  // Pega o id da URL (/animal/123)
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmConstrucao numero={6} titulo="Detalhe do animal" rota={`/animal/${id}`} />;
}
