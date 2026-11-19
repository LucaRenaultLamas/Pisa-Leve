import { useLocalSearchParams } from 'expo-router';

import { EmConstrucao } from '@/components/EmConstrucao';

export default function TrilhaDetalhe() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EmConstrucao numero={5} titulo="Detalhe da trilha" rota={`/trilha/${id}`} />;
}
