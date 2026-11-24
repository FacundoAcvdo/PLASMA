import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Cloud, RotateCw } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch, ApiError } from '@/lib/api-fetch';
import { Boton, Screen, Titulo } from '@/components/ui';
import { WordCloudInteractive } from '@/components/wordcloud-interactive';
import type { WordCloudResponse } from '@/lib/wordcloud/types';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/wordcloud-view.tsx:
// mismo flujo (adopt/start/getWordCloudImage) y mismo contenido de tarjeta.
// La nube web (DOM) se reimplementa con Views; el hover es tap-en-palabra.

type Estado = 'idle' | 'running' | 'done';

const IDLE_HINT =
  'Muestra de forma visual las palabras que más se repiten en el conjunto de textos: cuanto más frecuente es una palabra, más grande se ve. Es una forma rápida de reconocer qué conceptos dominan, ideal para una primera exploración o para ilustrar resultados.';

function esRespuestaWordCloud(value: unknown): value is WordCloudResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.frequencies) && typeof v.total_words === 'number';
}

export default function NubeDePalabras() {
  const { colores } = useTema();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<WordCloudResponse | null>(null);

  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();
  const taskKey = datasetSeleccionado ? `wordcloud:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const ejecutarWordCloud = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setError(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'wordcloud',
      operation: 'visualizeWordCloud',
      jobType: 'wordcloud',
      dataset: datasetSeleccionado,
      body: { dataset: datasetSeleccionado },
      successMessage: 'Nube de palabras generada correctamente.',
    }).catch(() => setEstado('idle'));
  };

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'wordcloud',
      jobType: 'wordcloud',
      dataset: datasetSeleccionado,
      successMessage: 'Nube de palabras generada correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (esRespuestaWordCloud(task.result)) {
          setData(task.result);
          setError(null);
          setEstado('done');
        } else {
          setError('El servidor devolvió una nube incompleta. Volvé a ejecutar el análisis.');
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setError('No se pudo generar la nube de palabras. Intentá nuevamente.');
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
        const json = await apiFetch<WordCloudResponse>(
          '/wordcloud/getWordCloudImage',
          { method: 'POST', body: JSON.stringify({ dataset: datasetSeleccionado }) },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaWordCloud(json)) {
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
        setError('No se pudo cargar la nube de palabras. Intentá nuevamente.');
        setEstado('idle');
      }
    };
    fetchResults();
  }, [datasetSeleccionado]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Nube de palabras</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seleccioná un dataset para generar su nube de palabras.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  if (estado !== 'done') {
    return (
      <Screen>
        <Titulo>Nube de palabras</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Términos más frecuentes del dataset: {datasetSeleccionado}
        </Text>
        <View className="items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14">
          <View className="size-14 items-center justify-center rounded-2xl bg-primario-50 dark:bg-primario-950">
            {estado === 'running' ? (
              <ActivityIndicator size="large" color={colores.primario} />
            ) : (
              <Cloud size={24} color={colores.primario} />
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
              ? 'Revisá la conexión y volvé a generar la nube.'
              : estado === 'running'
                ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
                : IDLE_HINT}
          </Text>
          <View className="mt-4 w-full">
            <Boton
              titulo={estado === 'running' ? 'Ejecutando…' : 'Generar nube de palabras'}
              onPress={ejecutarWordCloud}
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
              onPress={ejecutarWordCloud}
              className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <RotateCw size={14} color={colores.texto} />
              <Text className="text-sm text-slate-900 dark:text-slate-100">Volver a ejecutar</Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <View className="px-4 pb-1 pt-4">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colores.texto }}>
                Nube de palabras
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {data
                  ? `${data.documents_processed} documentos · ${data.total_words.toLocaleString()} palabras · ${data.frequencies.length} principales`
                  : '200 términos principales'}
              </Text>
            </View>
            <View className="gap-4 px-4 pb-4 pt-2">
              {!data ? (
                <Text className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos</Text>
              ) : (
                <WordCloudInteractive
                  frequencies={data.frequencies}
                  total_words={data.total_words}
                  max_count={data.max_count}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
