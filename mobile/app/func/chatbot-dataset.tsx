import { useLocalSearchParams } from 'expo-router';
import { PanelChat } from '@/components/chat-panel';
import { useDataset } from '@/context/dataset-context';

// Espejo de TF-U-FRONTEND/components/views/dataset-chatbot-view.tsx.
// El dataset sale del parámetro de ruta (cuando se llega desde el historial)
// o del dataset seleccionado globalmente.
export default function ChatbotDataset() {
  const { dataset_name } = useLocalSearchParams<{ dataset_name?: string }>();
  const { datasetSeleccionado } = useDataset();
  const datasetName = dataset_name ?? datasetSeleccionado ?? null;

  return <PanelChat datasetName={datasetName} />;
}
