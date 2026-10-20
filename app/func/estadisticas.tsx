import { useEffect, useState, type ReactNode } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChartColumn, RotateCw } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch, ApiError } from '@/lib/api-fetch';
import { Boton, Screen, Titulo } from '@/components/ui';
import {
  EdaClassDistribution,
  EdaDistribution,
  EdaSentenceBoxPlot,
  EdaSentenceFreq,
} from '@/components/eda-charts';
import type {
  ClassStats,
  CorpusStats,
  DistributionItem,
  EdaResponse,
  SentenceFreqItem,
  SentenceStats,
} from '@/lib/eda/types';

// Espejo de TF-U-FRONTEND/components/views/stats-view.tsx:
// mismo flujo (adopt/start/getResults) y mismo contenido por tarjeta.
// Los gráficos de recharts se reimplementan con Views puras (sin SVG);
// el hover de web es tap-en-barra en mobile.

type Estado = 'idle' | 'running' | 'done';

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function esRespuestaEda(value: unknown): value is EdaResponse {
  if (!esObjeto(value)) return false;
  return (
    esObjeto(value.corpus_stats) &&
    Array.isArray(value.class_stats) &&
    esObjeto(value.sentence_stats) &&
    Array.isArray(value.sentence_freq) &&
    Array.isArray(value.distribution)
  );
}

function Tarjeta({
  titulo,
  subtitulo,
  children,
}: {
  titulo: string;
  subtitulo: string;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-slate-200 bg-white">
      <View className="px-4 pb-1 pt-4">
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0f172a' }}>
          {titulo}
        </Text>
        <Text className="mt-0.5 text-xs text-slate-500">{subtitulo}</Text>
      </View>
      <View className="gap-4 px-4 pb-4 pt-2">{children}</View>
    </View>
  );
}

function Tabla({
  columnas,
  filas,
}: {
  columnas: { titulo: string; alinear: 'left' | 'right' }[];
  filas: (string | number | null | undefined)[][];
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator className="rounded-lg border border-slate-200">
      <View>
        <View className="flex-row border-b border-slate-200 bg-slate-50">
          {columnas.map((c, i) => (
            <View
              key={i}
              style={{ width: 120 }}
              className={`px-3 py-2 ${c.alinear === 'right' ? 'items-end' : 'items-start'} ${i % 2 === 1 ? 'bg-slate-100/70' : ''}`}
            >
              <Text
                style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#0f172a' }}
                className={c.alinear === 'right' ? 'text-right' : 'text-left'}
              >
                {c.titulo}
              </Text>
            </View>
          ))}
        </View>
        {filas.map((fila, fi) => (
          <View
            key={fi}
            className={`flex-row ${fi < filas.length - 1 ? 'border-b border-slate-100' : ''}`}
          >
            {fila.map((valor, ci) => (
              <View
                key={ci}
                style={{ width: 120 }}
                className={`px-3 py-2 ${columnas[ci]?.alinear === 'right' ? 'items-end' : 'items-start'} ${ci % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
              >
                <Text className="text-[13px] text-slate-700">
                  {valor ?? ''}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const COLUMNAS_CORPUS = [
  { titulo: 'Textos', alinear: 'right' },
  { titulo: 'Vocabulario', alinear: 'right' },
  { titulo: 'Palabras', alinear: 'right' },
  { titulo: 'Palabras prom.', alinear: 'right' },
  { titulo: 'Oraciones', alinear: 'right' },
  { titulo: 'Oraciones prom.', alinear: 'right' },
  { titulo: 'Oraciones mín', alinear: 'right' },
  { titulo: 'Oraciones máx', alinear: 'right' },
] as const;

const COLUMNAS_CLASE = [
  { titulo: 'Clase', alinear: 'left' },
  { titulo: 'Textos', alinear: 'left' },
  { titulo: 'Vocabulario', alinear: 'right' },
  { titulo: 'Palabras', alinear: 'right' },
  { titulo: 'Palabras prom.', alinear: 'right' },
  { titulo: 'Oraciones', alinear: 'right' },
  { titulo: 'Oraciones prom.', alinear: 'right' },
  { titulo: 'Oraciones mín', alinear: 'right' },
  { titulo: 'Oraciones máx', alinear: 'right' },
] as const;

export default function Estadisticas() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<CorpusStats | null>(null);
  const [classStats, setClassStats] = useState<ClassStats[] | null>(null);
  const [sentenceStats, setSentenceStats] = useState<SentenceStats | null>(null);
  const [sentenceFreq, setSentenceFreq] = useState<SentenceFreqItem[] | null>(null);
  const [distribution, setDistribution] = useState<DistributionItem[] | null>(null);

  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();
  const taskKey = datasetSeleccionado ? `eda:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const aplicarResultado = (data: unknown) => {
    if (!esRespuestaEda(data)) {
      setError('El servidor devolvió estadísticas incompletas. Volvé a ejecutar el análisis.');
      setEstado('idle');
      return false;
    }
    setStats(data.corpus_stats);
    setClassStats(data.class_stats);
    setSentenceStats(data.sentence_stats);
    setSentenceFreq(data.sentence_freq);
    setDistribution(data.distribution);
    setError(null);
    return true;
  };

  const ejecutarEda = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setError(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'eda',
      operation: 'eda',
      jobType: 'eda',
      dataset: datasetSeleccionado,
      body: { dataset: datasetSeleccionado },
      successMessage: 'Estadísticas calculadas correctamente.',
    }).catch(() => setEstado('idle'));
  };

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'eda',
      jobType: 'eda',
      dataset: datasetSeleccionado,
      successMessage: 'Estadísticas calculadas correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (aplicarResultado(task.result)) setEstado('done');
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setError('No se pudieron calcular las estadísticas. Intentá nuevamente.');
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
        const data = await apiFetch<EdaResponse>(
          '/eda/getResults',
          { method: 'POST', body: JSON.stringify({ dataset: datasetSeleccionado }) },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaEda(data)) {
          setError('El servidor devolvió estadísticas incompletas. Volvé a ejecutar el análisis.');
          setEstado('idle');
          return;
        }
        if (aplicarResultado(data)) setEstado('done');
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) {
          setEstado('idle');
          return;
        }
        setError('No se pudieron cargar las estadísticas. Intentá nuevamente.');
        setEstado('idle');
      }
    };
    fetchResults();
  }, [datasetSeleccionado]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Estadísticas generales</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset para ver sus estadísticas.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  if (estado !== 'done') {
    return (
      <Screen>
        <Titulo>Estadísticas generales</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Resumen descriptivo del dataset: {datasetSeleccionado}
        </Text>
        <View className="items-center rounded-xl border border-slate-200 bg-white px-6 py-14">
          <View className="size-14 items-center justify-center rounded-2xl bg-indigo-50">
            {estado === 'running' ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : (
              <ChartColumn size={24} color="#4f46e5" />
            )}
          </View>
          <Text
            className="mt-4 text-center text-sm text-slate-900"
            style={{ fontFamily: 'Inter_500Medium' }}
          >
            {error ?? (estado === 'running'
              ? 'Esperando resultados…'
              : 'Esta operación no se ejecuta automáticamente')}
          </Text>
          <Text className="mt-1 max-w-md text-center text-sm text-slate-500">
            {error
              ? 'Revisá la conexión y volvé a calcular las estadísticas.'
              : estado === 'running'
              ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
              : 'Generá un panorama general de los textos cargados: cuántos documentos hay, cuántas palabras y oraciones contienen y cuántas palabras distintas aparecen. Sirve como primer diagnóstico para saber con qué datos trabajás y para comparar entre grupos antes de análisis más específicos.'}
          </Text>
          <View className="mt-4 w-full">
            <Boton
              titulo={estado === 'running' ? 'Ejecutando…' : 'Calcular estadísticas'}
              onPress={ejecutarEda}
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
              <Text className="text-sm text-slate-500">Análisis completado</Text>
            </View>
            <TouchableOpacity
              onPress={ejecutarEda}
              className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <RotateCw size={14} color="#0f172a" />
              <Text className="text-sm text-slate-900">Volver a ejecutar</Text>
            </TouchableOpacity>
          </View>

          <Tarjeta titulo="Estadísticas de corpus" subtitulo="Resumen general del dataset">
            <Tabla
              columnas={[...COLUMNAS_CORPUS]}
              filas={
                stats
                  ? [
                      [
                        stats.texto,
                        stats.vocabulary,
                        stats.words,
                        stats.word_avg,
                        stats.sentences,
                        stats.sentence_avg,
                        stats.sentence_min,
                        stats.sentence_max,
                      ],
                    ]
                  : []
              }
            />
            <Tabla
              columnas={[...COLUMNAS_CLASE]}
              filas={(classStats ?? []).map((s) => [
                s?.clase,
                s?.texto,
                s?.vocabulary,
                s?.words,
                s?.word_avg,
                s?.sentences,
                s?.sentence_avg,
                s?.sentence_min,
                s?.sentence_max,
              ])}
            />
          </Tarjeta>

          {sentenceStats && sentenceFreq && (
            <Tarjeta
              titulo="Distribución de oraciones"
              subtitulo="Diagrama de caja + histograma — tocá las barras para detalles"
            >
              <EdaSentenceBoxPlot stats={sentenceStats} />
              <EdaSentenceFreq data={sentenceFreq} />
            </Tarjeta>
          )}

          {classStats && (
            <Tarjeta titulo="Distribución por clase" subtitulo="Comparativa de métricas por clase">
              <EdaClassDistribution classStats={classStats} />
            </Tarjeta>
          )}

          {distribution && (
            <Tarjeta
              titulo="Histograma por clase"
              subtitulo="Palabras y oraciones por clase — interactivo"
            >
              <EdaDistribution distribution={distribution} />
            </Tarjeta>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
