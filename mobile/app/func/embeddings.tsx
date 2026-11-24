import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RotateCw, Sparkles } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch, ApiError } from '@/lib/api-fetch';
import { Boton, Screen, Titulo } from '@/components/ui';
import { EmbeddingsScatter } from '@/components/embeddings-scatter';
import type { EmbeddingsResponse } from '@/lib/embeddings/types';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/embeddings-view.tsx:
// mismo flujo (adopt/start/getEmbeddingsImage) y mismo contenido de tarjeta.
// El scatter web (canvas) se reimplementa con react-native-svg; el hover es
// tap-en-punto en mobile.

type Estado = 'idle' | 'running' | 'done';

const IDLE_HINT =
  'Convierte cada mensaje en una representación numérica de su significado y lo ubica en un mapa 2D. Los textos parecidos quedan cerca: sirve para descubrir temas recurrentes y ver de un vistazo cómo se agrupa el contenido del dataset.';

function esRespuestaEmbeddings(value: unknown): value is EmbeddingsResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.points) && Array.isArray(v.clusters) && typeof v.total === 'number';
}

export default function Embeddings() {
  const { colores } = useTema();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmbeddingsResponse | null>(null);

  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();
  const taskKey = datasetSeleccionado ? `embeddings:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const ejecutarEmbeddings = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setError(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'clustering',
      operation: 'visualizeEmbeddings',
      jobType: 'embeddings',
      dataset: datasetSeleccionado,
      body: { dataset: datasetSeleccionado },
      successMessage: 'Embeddings calculados correctamente.',
    }).catch(() => setEstado('idle'));
  };

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'clustering',
      jobType: 'embeddings',
      dataset: datasetSeleccionado,
      successMessage: 'Embeddings calculados correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (esRespuestaEmbeddings(task.result)) {
          setData(task.result);
          setError(null);
          setEstado('done');
        } else {
          setError('El servidor devolvió embeddings incompletos. Volvé a ejecutar el análisis.');
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setError('No se pudieron calcular los embeddings. Intentá nuevamente.');
        setEstado('idle');
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask]);

  useEffect(() => {
    if (!datasetSeleccionado) return;
    const fetchResults = async () => {
      try {
        setError(null);
        setEstado('running');
        const json = await apiFetch<EmbeddingsResponse>(
          '/clustering/getEmbeddingsImage',
          { method: 'POST', body: JSON.stringify({ dataset: datasetSeleccionado }) },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaEmbeddings(json)) {
          setEstado('idle');
          return;
        }
        setData(json);
        setEstado('done');
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setEstado('idle');
          return;
        }
        setError('No se pudieron cargar los embeddings. Intentá nuevamente.');
        setEstado('idle');
      }
    };
    fetchResults();
  }, [datasetSeleccionado]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Embeddings</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seleccioná un dataset para ver sus embeddings.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  if (estado !== 'done') {
    return (
      <Screen>
        <Titulo>Embeddings</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Proyección 2D del dataset: {datasetSeleccionado}
        </Text>
        <View className="items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14">
          <View className="size-14 items-center justify-center rounded-2xl bg-primario-50 dark:bg-primario-950">
            {estado === 'running' ? (
              <ActivityIndicator size="large" color={colores.primario} />
            ) : (
              <Sparkles size={24} color={colores.primario} />
            )}
          </View>
          <Text
            className="mt-4 text-center text-sm text-slate-900 dark:text-slate-100"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {error ??
              (estado === 'running'
                ? 'Esperando resultados…'
                : 'Esta operación no se ejecuta automáticamente')}
          </Text>
          <Text className="mt-1 max-w-md text-center text-sm text-slate-500 dark:text-slate-400">
            {error
              ? 'Revisá la conexión y volvé a calcular los embeddings.'
              : estado === 'running'
                ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
                : IDLE_HINT}
          </Text>
          <View className="mt-4 w-full">
            <Boton
              titulo={estado === 'running' ? 'Ejecutando…' : 'Calcular embeddings'}
              onPress={ejecutarEmbeddings}
              deshabilitado={estado === 'running'}
            />
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-10">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-row items-center gap-2">
              <View className="size-2 rounded-full bg-emerald-500" />
              <Text className="text-sm text-slate-500 dark:text-slate-400">Análisis completado</Text>
            </View>
            <TouchableOpacity
              onPress={ejecutarEmbeddings}
              className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <RotateCw size={14} color={colores.texto} />
              <Text className="text-sm text-slate-900 dark:text-slate-100">Volver a ejecutar</Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <View className="px-4 pb-1 pt-4">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colores.texto }}>
                Proyección 2D — UMAP
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                coseno · 2 componentes · HDBSCAN interactivo
              </Text>
            </View>
            <View className="gap-4 px-4 pb-4 pt-2">
              {!data ? (
                <Text className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos</Text>
              ) : (
                <EmbeddingsScatter
                  points={data.points}
                  clusters={data.clusters}
                  outliers={data.outliers}
                  total={data.total}
                  truncated={data.truncated}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
