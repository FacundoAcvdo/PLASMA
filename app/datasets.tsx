import { FlatList, RefreshControl, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useDataset, useDatasetsQuery } from '@/context/dataset-context';
import { Boton, Cargando, Screen, Subtitulo, Titulo } from '@/components/ui';

export default function Datasets() {
  const router = useRouter();
  const { datasetSeleccionado, setDatasetSeleccionado } = useDataset();
  const { data, isLoading, refetch, isRefetching } = useDatasetsQuery();

  if (isLoading) return <Cargando texto="Cargando datasets…" />;

  return (
    <Screen>
      <Titulo>Datasets</Titulo>
      <Subtitulo>Tocá uno para seleccionarlo o cargá uno nuevo.</Subtitulo>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.dataset_id}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); }} />}
        ListEmptyComponent={
          <Text className="py-10 text-center text-sm text-slate-500">
            Todavía no hay datasets cargados.
          </Text>
        }
        renderItem={({ item }) => {
          const seleccionado = item.dataset_name === datasetSeleccionado;
          return (
            <TouchableOpacity
              onPress={() => setDatasetSeleccionado(item.dataset_name)}
              className={`mb-2 rounded-xl border px-4 py-3 ${
                seleccionado ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'
              }`}
            >
              <Text className="text-base font-semibold text-slate-900">{item.dataset_name}</Text>
              <Text className="text-xs text-slate-500">
                {(item.dataset_size / 1024).toFixed(1)} KB · {item.embedding_size} embeddings
              </Text>
            </TouchableOpacity>
          );
        }}
      />
      <View className="mt-2">
        <Boton titulo="Cargar dataset" onPress={() => router.push('/upload')} />
      </View>
    </Screen>
  );
}
