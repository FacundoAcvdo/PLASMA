import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { HeartCrack, RotateCw } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch, ApiError } from '@/lib/api-fetch';
import { Boton, Screen, Titulo } from '@/components/ui';
import { Selector } from '@/components/Selector';
import {
  EmotionClassHeatmap,
  EmotionCorpusMeanBars,
  EmotionCorrelationHeatmap,
  EmotionDistributionList,
} from '@/components/emotion-charts';
import type { EmotionsResponse, MetricaClase } from '@/lib/emotions/types';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/emotions-view.tsx:
// mismo flujo (adopt/start/getResults) y mismo contenido/selectores.
// Los gráficos de recharts/grid se reimplementan con Views; el hover es tap.

type Estado = 'idle' | 'running' | 'done';
type VistaCorpus = 'mean' | 'distribution' | 'correlation';

const IDLE_HINT =
  'Analiza cada mensaje e identifica la emoción que predomina en él (por ejemplo, tristeza, enojo, miedo o alegría). Permite ver qué emociones aparecen más en el conjunto de textos, útil para estudiar el estado emocional asociado al bienestar y al riesgo en salud mental.';

const CORPUS_VIEWS = [
  { valor: 'mean', etiqueta: 'Promedio' },
  { valor: 'distribution', etiqueta: 'Distribución' },
  { valor: 'correlation', etiqueta: 'Correlación' },
];

const CLASS_VIEWS = [
  { valor: 'mean', etiqueta: 'Promedio' },
  { valor: 'median', etiqueta: 'Mediana' },
  { valor: 'std', etiqueta: 'Desviación estándar' },
];

function esRespuestaEmotions(value: unknown): value is EmotionsResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.corpus_stats === 'object' &&
    v.corpus_stats !== null &&
    Array.isArray(v.class_stats) &&
    typeof v.correlation === 'object' &&
    Array.isArray(v.distribution)
  );
}

function Chip({ children, relleno }: { children: ReactNode; relleno?: boolean }) {
  return (
    <View
      className={`rounded-md border px-2 py-0.5 ${
        relleno ? 'border-transparent bg-slate-100 dark:bg-slate-800' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
      }`}
    >
      <Text className="text-[11px] text-slate-600 dark:text-slate-400">{children}</Text>
    </View>
  );
}

export default function Emociones() {
  const { colores } = useTema();
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<EmotionsResponse | null>(null);
  const [vistaCorpus, setVistaCorpus] = useState<VistaCorpus>('mean');
  const [metricaClase, setMetricaClase] = useState<MetricaClase>('mean');

  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();
  const taskKey = datasetSeleccionado ? `emotions:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const ejecutarEmotions = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setError(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'emotions',
      operation: 'analyzeEmotions',
      jobType: 'emotions',
      dataset: datasetSeleccionado,
      body: { dataset: datasetSeleccionado },
      successMessage: 'Emociones analizadas correctamente.',
    }).catch(() => setEstado('idle'));
  };

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'emotions',
      jobType: 'emotions',
      dataset: datasetSeleccionado,
      successMessage: 'Emociones analizadas correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (esRespuestaEmotions(task.result)) {
          setData(task.result);
          setError(null);
          setEstado('done');
        } else {
          setError('El servidor devolvió emociones incompletas. Volvé a ejecutar el análisis.');
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setError('No se pudieron analizar las emociones. Intentá nuevamente.');
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
        const json = await apiFetch<EmotionsResponse>(
          '/emotions/getResults',
          { method: 'POST', body: JSON.stringify({ dataset: datasetSeleccionado }) },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaEmotions(json)) {
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
        setError('No se pudieron cargar las emociones. Intentá nuevamente.');
        setEstado('idle');
      }
    };
    fetchResults();
  }, [datasetSeleccionado]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Emociones</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Seleccioná un dataset para analizar sus emociones.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  if (estado !== 'done') {
    return (
      <Screen>
        <Titulo>Emociones</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
          Emociones predominantes del dataset: {datasetSeleccionado}
        </Text>
        <View className="items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-14">
          <View className="size-14 items-center justify-center rounded-2xl bg-primario-50 dark:bg-primario-950">
            {estado === 'running' ? (
              <ActivityIndicator size="large" color={colores.primario} />
            ) : (
              <HeartCrack size={24} color={colores.primario} />
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
              ? 'Revisá la conexión y volvé a detectar las emociones.'
              : estado === 'running'
                ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
                : IDLE_HINT}
          </Text>
          <View className="mt-4 w-full">
            <Boton
              titulo={estado === 'running' ? 'Ejecutando…' : 'Detectar emociones'}
              onPress={ejecutarEmotions}
              deshabilitado={estado === 'running'}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const calidad = data?.calidad;

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
              onPress={ejecutarEmotions}
              className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
            >
              <RotateCw size={14} color={colores.texto} />
              <Text className="text-sm text-slate-900 dark:text-slate-100">Volver a ejecutar</Text>
            </TouchableOpacity>
          </View>

          {/* CORPUS */}
          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <View className="gap-2 px-4 pb-1 pt-4">
              <View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colores.texto }}>
                  Emociones — corpus
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  6 emociones · modelos ES + EN según idioma
                </Text>
              </View>
              {calidad && (
                <View className="flex-row flex-wrap gap-1.5">
                  <Chip relleno>Neutral: {(calidad.neutral_rate * 100).toFixed(1)}%</Chip>
                  <Chip>Baja confianza: {(calidad.low_confidence_rate * 100).toFixed(1)}%</Chip>
                  <Chip>
                    ES {calidad.n_es} · EN {calidad.n_en}
                  </Chip>
                </View>
              )}
              <View className="mt-1">
                <Selector
                  etiqueta="Vista"
                  valor={vistaCorpus}
                  opciones={CORPUS_VIEWS}
                  onCambiar={(v) => setVistaCorpus(v as VistaCorpus)}
                />
              </View>
            </View>
            <View className="px-4 pb-4 pt-2">
              {!data ? (
                <Text className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos</Text>
              ) : vistaCorpus === 'mean' ? (
                <EmotionCorpusMeanBars corpusStats={data.corpus_stats} />
              ) : vistaCorpus === 'distribution' ? (
                <EmotionDistributionList distribution={data.distribution} />
              ) : (
                <EmotionCorrelationHeatmap correlation={data.correlation} topWords={data.top_words} />
              )}
            </View>
          </View>

          {/* CLASES */}
          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <View className="gap-2 px-4 pb-1 pt-4">
              <View>
                <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: colores.texto }}>
                  Emociones por clase
                </Text>
                <Text className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Comparativa entre clases del dataset
                </Text>
              </View>
              <View className="mt-1">
                <Selector
                  etiqueta="Métrica"
                  valor={metricaClase}
                  opciones={CLASS_VIEWS}
                  onCambiar={(v) => setMetricaClase(v as MetricaClase)}
                />
              </View>
            </View>
            <View className="px-4 pb-4 pt-2">
              {!data ? (
                <Text className="py-4 text-center text-sm text-slate-500 dark:text-slate-400">Sin datos</Text>
              ) : (
                <EmotionClassHeatmap
                  classStats={data.class_stats}
                  emotions={data.emotions}
                  metric={metricaClase}
                />
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
