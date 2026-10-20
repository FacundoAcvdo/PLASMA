import { useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ChevronDown, ChevronUp, Trash2 } from 'lucide-react-native';
import { apiFetch } from '@/lib/api-fetch';
import { toast } from '@/lib/toast';
import {
  useDatasetsQuery,
  useInvalidarDatasets,
  type DatasetInfo,
} from '@/context/dataset-context';
import { Cargando, FUENTE, Screen, Subtitulo, Titulo } from '@/components/ui';

// Espejo de TF-U-FRONTEND/components/views/storage-management-view.tsx.
// El acordeón web pasa a tarjetas expandibles y los borrados piden
// confirmación (en web se ejecutan directo).

const TOTAL_STORAGE = 500 * 1024 * 1024;

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unitIndex = Math.floor(Math.log(bytes) / Math.log(1024));
  const index = Math.min(unitIndex, units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`;
}

function clampPercentage(value: number): number {
  return Math.min(Math.max(value, 0), 100);
}

function tamanoTotal(dataset: DatasetInfo): number {
  return dataset.dataset_size + dataset.embedding_size + dataset.embedding_chunked_size;
}

function Barra({ porcentaje }: { porcentaje: number }) {
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <View
        className="h-full rounded-full bg-indigo-600"
        style={{ width: `${clampPercentage(porcentaje)}%` }}
      />
    </View>
  );
}

function StatCard({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View className="w-[48%] rounded-lg border border-slate-200 bg-slate-50/40 p-3">
      <Text className="text-xs text-slate-500">{etiqueta}</Text>
      <Text
        className="mt-1 text-sm text-slate-900"
        style={{ fontFamily: FUENTE.semibold }}
        numberOfLines={1}
      >
        {valor}
      </Text>
    </View>
  );
}

function Desglose({
  etiqueta,
  bytes,
  porcentaje,
}: {
  etiqueta: string;
  bytes: number;
  porcentaje: number;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View>
          <Text style={{ fontFamily: FUENTE.medium, fontSize: 14, color: '#0f172a' }}>
            {etiqueta}
          </Text>
          <Text className="text-xs text-slate-500">{formatBytes(bytes)}</Text>
        </View>
        <View className="rounded-full bg-slate-100 px-2 py-0.5">
          <Text className="text-xs text-slate-600">{porcentaje.toFixed(2)}%</Text>
        </View>
      </View>
      <Barra porcentaje={porcentaje} />
    </View>
  );
}

type Confirmacion = {
  titulo: string;
  descripcion: string;
  onConfirmar: () => void;
};

export default function Almacenamiento() {
  const { data: datasets, isLoading } = useDatasetsQuery();
  const invalidar = useInvalidarDatasets();

  const [eliminandoDataset, setEliminandoDataset] = useState<string | null>(null);
  const [eliminandoTodos, setEliminandoTodos] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [confirmacion, setConfirmacion] = useState<Confirmacion | null>(null);

  if (isLoading) {
    return <Cargando texto="Cargando almacenamiento…" />;
  }

  const totalDatasetSize = (datasets ?? []).reduce((total, d) => total + tamanoTotal(d), 0);
  const totalFilesSize = (datasets ?? []).reduce((total, d) => total + d.dataset_size, 0);
  const totalEmbeddingsSize = (datasets ?? []).reduce(
    (total, d) => total + d.embedding_size,
    0,
  );
  const totalChunkedSize = (datasets ?? []).reduce(
    (total, d) => total + d.embedding_chunked_size,
    0,
  );

  const availableStorage = Math.max(TOTAL_STORAGE - totalDatasetSize, 0);
  const percentageUsed = clampPercentage((totalDatasetSize / TOTAL_STORAGE) * 100);

  const ordenados = [...(datasets ?? [])].sort((a, b) => tamanoTotal(b) - tamanoTotal(a));

  async function eliminarDataset(datasetId: string) {
    try {
      setEliminandoDataset(datasetId);
      await apiFetch(
        `/dataset/deleteDataset?dataset_id=${encodeURIComponent(datasetId)}`,
        { method: 'DELETE' },
      );
      await invalidar();
      toast.success('Dataset eliminado correctamente.');
    } catch {
      // apiFetch ya mostró el toast de error
    } finally {
      setEliminandoDataset(null);
    }
  }

  async function eliminarTodos() {
    try {
      setEliminandoTodos(true);
      await apiFetch('/dataset/deleteDatasetsByUser', { method: 'DELETE' });
      await invalidar();
      toast.success('Todos los datasets fueron eliminados correctamente.');
    } catch {
      // apiFetch ya mostró el toast de error
    } finally {
      setEliminandoTodos(false);
    }
  }

  function pedirEliminar(dataset: DatasetInfo) {
    const datasetId = dataset.dataset_id;
    const nombre = dataset.dataset_name;
    setConfirmacion({
      titulo: 'Eliminar dataset',
      descripcion: `Se eliminará ${nombre} junto con sus embeddings y fragmentos. Esta acción no se puede deshacer.`,
      onConfirmar: () => void eliminarDataset(datasetId),
    });
  }

  function pedirEliminarTodos() {
    const cantidad = datasets?.length ?? 0;
    setConfirmacion({
      titulo: 'Eliminar todos los datasets',
      descripcion: `Se eliminarán ${cantidad} datasets almacenados junto con sus embeddings y fragmentos. Esta acción no se puede deshacer.`,
      onConfirmar: () => void eliminarTodos(),
    });
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Titulo>Almacenamiento</Titulo>
        <Subtitulo>Espacio utilizado por tus datasets.</Subtitulo>

        <View className="gap-4">
          <View className="gap-4 rounded-xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <Text
                  style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}
                >
                  Almacenamiento
                </Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Espacio utilizado por tus datasets
                </Text>
              </View>
              <View className="rounded-full bg-slate-100 px-2.5 py-1">
                <Text className="text-sm text-slate-700">
                  {percentageUsed.toFixed(1)}% utilizado
                </Text>
              </View>
            </View>

            <View className="gap-2">
              <View className="flex-row items-end justify-between gap-3">
                <View className="flex-row items-baseline">
                  <Text
                    style={{ fontFamily: FUENTE.bold, fontSize: 24, color: '#0f172a' }}
                  >
                    {formatBytes(totalDatasetSize)}
                  </Text>
                  <Text className="ml-1 text-sm text-slate-500">
                    / {formatBytes(TOTAL_STORAGE)}
                  </Text>
                </View>
                <Text className="text-sm text-slate-500">
                  {formatBytes(availableStorage)} disponibles
                </Text>
              </View>
              <Barra porcentaje={percentageUsed} />
            </View>

            <View className="flex-row flex-wrap justify-between gap-3">
              <StatCard etiqueta="Documentos" valor={formatBytes(totalFilesSize)} />
              <StatCard etiqueta="Embeddings" valor={formatBytes(totalEmbeddingsSize)} />
              <StatCard
                etiqueta="Fragmentos de embeddings"
                valor={formatBytes(totalChunkedSize)}
              />
              <StatCard etiqueta="Datasets" valor={`${datasets?.length ?? 0}`} />
            </View>

            <View className="items-end">
              <TouchableOpacity
                onPress={pedirEliminarTodos}
                disabled={eliminandoTodos || (datasets?.length ?? 0) === 0}
                className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3 ${
                  eliminandoTodos || (datasets?.length ?? 0) === 0
                    ? 'bg-red-300'
                    : 'bg-red-600'
                }`}
              >
                {eliminandoTodos ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Trash2 size={16} color="#fff" />
                )}
                <Text
                  style={{ fontFamily: FUENTE.semibold, fontSize: 15, color: '#fff' }}
                >
                  {eliminandoTodos ? 'Eliminando...' : 'Eliminar todos'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View className="rounded-xl border border-slate-200 bg-white">
            <View className="px-4 pb-3 pt-4">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                Datasets almacenados
              </Text>
              <Text className="mt-1 text-sm text-slate-500">
                Haz click en un dataset para ver su desglose.
              </Text>
            </View>

            <View className="gap-3 px-4 pb-4">
              {ordenados.length === 0 ? (
                <View className="items-center rounded-lg border border-dashed border-slate-300 p-6">
                  <Text style={{ fontFamily: FUENTE.medium, fontSize: 14, color: '#0f172a' }}>
                    No tienes datasets almacenados
                  </Text>
                  <Text className="mt-1 text-center text-sm text-slate-500">
                    Cuando subas un dataset aparecerá aquí.
                  </Text>
                </View>
              ) : (
                ordenados.map((dataset) => {
                  const datasetTotal = tamanoTotal(dataset);
                  const storagePercentage = clampPercentage(
                    (datasetTotal / TOTAL_STORAGE) * 100,
                  );
                  const filePercentage =
                    datasetTotal > 0 ? (dataset.dataset_size / datasetTotal) * 100 : 0;
                  const embeddingPercentage =
                    datasetTotal > 0 ? (dataset.embedding_size / datasetTotal) * 100 : 0;
                  const chunkedPercentage =
                    datasetTotal > 0
                      ? (dataset.embedding_chunked_size / datasetTotal) * 100
                      : 0;
                  const expandido = abierto === dataset.dataset_id;

                  return (
                    <View
                      key={dataset.dataset_id}
                      className="gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <TouchableOpacity
                        onPress={() => setAbierto(expandido ? null : dataset.dataset_id)}
                        className="gap-2"
                      >
                        <View className="flex-row items-center justify-between gap-3">
                          <Text
                            numberOfLines={1}
                            className="min-w-0 flex-1 text-slate-900"
                            style={{ fontFamily: FUENTE.medium, fontSize: 14 }}
                          >
                            {dataset.dataset_name}
                          </Text>
                          <View className="flex-row shrink-0 items-center gap-2">
                            <Text className="text-sm text-slate-500">
                              {formatBytes(datasetTotal)}
                            </Text>
                            {expandido ? (
                              <ChevronUp size={16} color="#64748b" />
                            ) : (
                              <ChevronDown size={16} color="#64748b" />
                            )}
                          </View>
                        </View>
                        <Barra porcentaje={storagePercentage} />
                      </TouchableOpacity>

                      {expandido && (
                        <View className="gap-5 pt-1">
                          <View className="flex-row flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                            <View>
                              <Text className="text-xs text-slate-500">Tamaño total</Text>
                              <Text
                                style={{
                                  fontFamily: FUENTE.semibold,
                                  fontSize: 18,
                                  color: '#0f172a',
                                }}
                              >
                                {formatBytes(datasetTotal)}
                              </Text>
                            </View>
                            <View>
                              <Text className="text-xs text-slate-500">
                                Del almacenamiento
                              </Text>
                              <Text
                                style={{
                                  fontFamily: FUENTE.semibold,
                                  fontSize: 18,
                                  color: '#0f172a',
                                }}
                              >
                                {storagePercentage.toFixed(2)}%
                              </Text>
                            </View>
                          </View>

                          <Desglose
                            etiqueta="Documentos"
                            bytes={dataset.dataset_size}
                            porcentaje={filePercentage}
                          />
                          <Desglose
                            etiqueta="Embeddings"
                            bytes={dataset.embedding_size}
                            porcentaje={embeddingPercentage}
                          />
                          <Desglose
                            etiqueta="Fragmentos de embeddings"
                            bytes={dataset.embedding_chunked_size}
                            porcentaje={chunkedPercentage}
                          />

                          <View className="items-end">
                            <TouchableOpacity
                              onPress={() => pedirEliminar(dataset)}
                              disabled={eliminandoDataset === dataset.dataset_id}
                              className={`flex-row items-center justify-center gap-2 rounded-lg px-3 py-2.5 ${
                                eliminandoDataset === dataset.dataset_id
                                  ? 'bg-red-300'
                                  : 'bg-red-600'
                              }`}
                            >
                              {eliminandoDataset === dataset.dataset_id ? (
                                <ActivityIndicator size="small" color="#fff" />
                              ) : (
                                <Trash2 size={14} color="#fff" />
                              )}
                              <Text
                                style={{
                                  fontFamily: FUENTE.semibold,
                                  fontSize: 13,
                                  color: '#fff',
                                }}
                              >
                                {eliminandoDataset === dataset.dataset_id
                                  ? 'Eliminando...'
                                  : 'Eliminar dataset'}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={confirmacion !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmacion(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white p-5">
            <Text
              style={{
                fontFamily: FUENTE.semibold,
                fontSize: 17,
                color: '#0f172a',
                marginBottom: 8,
              }}
            >
              {confirmacion?.titulo}
            </Text>
            <Text className="mb-5 text-sm leading-relaxed text-slate-600">
              {confirmacion?.descripcion}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const accion = confirmacion?.onConfirmar;
                setConfirmacion(null);
                accion?.();
              }}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3.5"
            >
              <Trash2 size={16} color="#fff" />
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                Eliminar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmacion(null)}
              className="mt-2 items-center rounded-xl border border-slate-200 px-4 py-3.5"
            >
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
