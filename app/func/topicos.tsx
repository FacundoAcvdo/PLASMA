import { useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AlertCircle, FileText, Hash, Layers, RotateCw, Settings2, X } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch } from '@/lib/api-fetch';
import { Boton, Screen, Titulo } from '@/components/ui';
import { Selector } from '@/components/Selector';
import {
  MAX_TOPICS_OPTIONS,
  esRespuestaTopics,
  getTopicTitle,
  type TopicModelingDocument,
  type TopicModelingResult,
  type TopicModelingTopic,
} from '@/lib/topics/types';

// Espejo de TF-U-FRONTEND/components/views/topics-view.tsx:
// mismo flujo (adopt/start/getTopicResults) y mismo contenido/selector.
// El Dialog de detalle se reimplementa con un Modal inferior.

type Estado = 'idle' | 'running' | 'done';

const IDLE_HINT =
  'Detecta automáticamente los temas principales presentes en los textos, agrupando los mensajes por asunto y mostrando las palabras más representativas de cada tema. Sirve para descubrir de qué se habla en un corpus grande sin necesidad de leerlo completo.';

const OPCIONES_MAX_TOPICS = MAX_TOPICS_OPTIONS.map((v) => ({
  valor: String(v),
  etiqueta: String(v),
}));

function DocumentoExpandible({
  document,
  index,
}: {
  document: TopicModelingDocument;
  index: number;
}) {
  const [expandido, setExpandido] = useState(false);
  const MAX_CHARS = 275;
  const esLargo = document.text.length > MAX_CHARS;
  const texto = expandido || !esLargo ? document.text : `${document.text.slice(0, MAX_CHARS)} ...`;

  return (
    <View className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <Text className="mb-1 text-xs text-slate-500" style={{ fontFamily: 'Inter_600SemiBold' }}>
        Documento {index + 1}
      </Text>
      <Text className="text-xs leading-5 text-slate-700">{texto}</Text>
      {esLargo && (
        <Pressable onPress={() => setExpandido((v) => !v)}>
          <Text className="mt-1 text-xs text-indigo-600" style={{ fontFamily: 'Inter_600SemiBold' }}>
            {expandido ? 'Ver menos' : 'Ver más'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function TopicRanking({
  topic,
  selected,
  onPress,
}: {
  topic: TopicModelingTopic;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg border p-3 ${
        selected ? 'border-indigo-200 bg-indigo-50/60' : 'border-slate-200 bg-white'
      }`}
    >
      <View className="flex-row gap-3">
        <View
          className={`size-9 items-center justify-center rounded-md ${
            selected ? 'bg-indigo-600' : 'bg-indigo-50'
          }`}
        >
          <Text
            className={selected ? 'text-white' : 'text-indigo-600'}
            style={{ fontFamily: 'Inter_600SemiBold', fontSize: 13 }}
          >
            {topic.topic_id + 1}
          </Text>
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text
              numberOfLines={1}
              className="text-sm text-slate-900"
              style={{ fontFamily: 'Inter_600SemiBold', flexShrink: 1 }}
            >
              {getTopicTitle(topic)}
            </Text>
            <View className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5">
              <Text className="text-[11px] text-slate-600">{topic.percentage.toFixed(1)}%</Text>
            </View>
          </View>

          <View className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <View
              className="h-full rounded-full bg-indigo-600"
              style={{ width: `${topic.percentage}%` }}
            />
          </View>

          <View className="mt-2 flex-row flex-wrap gap-x-2 gap-y-1">
            {topic.keywords.slice(0, 6).map((keyword, i) => (
              <Text key={i} className="text-xs text-slate-500">
                {keyword}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function StatTile({
  icon,
  label,
  value,
  muted,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <View className="flex-1 rounded-xl border border-slate-200 bg-white p-3">
      <View
        className={`size-8 items-center justify-center rounded-lg ${
          muted ? 'bg-slate-100' : 'bg-indigo-50'
        }`}
      >
        {icon}
      </View>
      <Text className="mt-2 text-[11px] text-slate-500">{label}</Text>
      <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#0f172a' }}>{value}</Text>
    </View>
  );
}

export default function Topicos() {
  const router = useRouter();
  const [estado, setEstado] = useState<Estado>('idle');
  const [error, setError] = useState<string | null>(null);
  const [topics, setTopics] = useState<TopicModelingResult | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<number | null>(null);
  const [maxTopics, setMaxTopics] = useState<number>(20);

  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();
  const taskKey = datasetSeleccionado ? `topics:${datasetSeleccionado}:${maxTopics}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const ejecutarTopicModeling = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setError(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'topicmodeling',
      operation: 'getTopics',
      jobType: 'topics',
      dataset: datasetSeleccionado,
      body: {
        dataset: datasetSeleccionado,
        max_topics: maxTopics,
      },
      successMessage: 'Tópicos generados correctamente.',
    }).catch(() => setEstado('idle'));
  };

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'topicmodeling',
      jobType: 'topics',
      dataset: datasetSeleccionado,
      successMessage: 'Tópicos generados correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        // El job puede haberse iniciado con otro max_topics: solo se aplica
        // si coincide; si no, se descarta (el aviso de éxito ya salió).
        const jobMax = Number(
          (task.params as { max_topics?: unknown } | null | undefined)?.max_topics,
        );
        if (!task.params || !Number.isFinite(jobMax) || jobMax === maxTopics) {
          if (esRespuestaTopics(task.result)) {
            setTopics(task.result);
            setError(null);
            setEstado('done');
          } else {
            setError('El servidor devolvió tópicos incompletos. Volvé a ejecutar el análisis.');
            setEstado('idle');
          }
        } else {
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setError('No se pudieron generar los tópicos. Intentá nuevamente.');
        setEstado('idle');
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask, maxTopics]);

  useEffect(() => {
    if (!datasetSeleccionado) return;
    const fetchResults = async () => {
      try {
        setError(null);
        setEstado('running');
        setSelectedTopicId(null);
        const json = await apiFetch<TopicModelingResult>(
          '/topicmodeling/getTopicResults',
          {
            method: 'POST',
            body: JSON.stringify({ dataset: datasetSeleccionado, max_topics: maxTopics }),
          },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaTopics(json)) {
          setTopics(null);
          setEstado('idle');
          return;
        }
        setTopics(json);
        setEstado('done');
      } catch {
        setTopics(null);
        setEstado('idle');
      }
    };
    fetchResults();
  }, [datasetSeleccionado, maxTopics]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Tópicos</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset para modelar sus tópicos.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  const selectedTopic = topics?.topics.find((topic) => topic.topic_id === selectedTopicId);

  const reductionNotice = topics
    ? topics.reduction && topics.reduction.achieved > topics.reduction.requested
      ? topics.reduction
      : topics.topics.length > maxTopics
        ? { requested: maxTopics, achieved: topics.topics.length }
        : null
    : null;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-10">
          {/* Configuración */}
          <View className="rounded-xl border border-slate-200 bg-white p-4">
            <View className="flex-row items-center gap-3">
              <View className="size-9 items-center justify-center rounded-lg bg-indigo-50">
                <Settings2 size={16} color="#4f46e5" />
              </View>
              <View className="flex-1">
                <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0f172a' }}>
                  Cantidad máxima de tópicos
                </Text>
                <Text className="text-xs text-slate-500">
                  Definí un tope para el modelado de tópicos.
                </Text>
              </View>
            </View>
            <View className="mt-3">
              <Selector
                etiqueta="Máximo"
                valor={String(maxTopics)}
                opciones={OPCIONES_MAX_TOPICS}
                onCambiar={(v) => setMaxTopics(Number(v))}
                deshabilitado={estado === 'running'}
              />
            </View>
          </View>

          {estado === 'done' && topics ? (
            <>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <View className="size-2 rounded-full bg-emerald-500" />
                  <Text className="text-sm text-slate-500">Análisis completado</Text>
                </View>
                <TouchableOpacity
                  onPress={ejecutarTopicModeling}
                  className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <RotateCw size={14} color="#0f172a" />
                  <Text className="text-sm text-slate-900">Volver a ejecutar</Text>
                </TouchableOpacity>
              </View>

              {reductionNotice && (
                <View className="flex-row items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
                  <AlertCircle size={20} color="#d97706" />
                  <Text className="flex-1 text-sm text-slate-900">
                    No se pudo reducir a los {reductionNotice.requested} tópicos pedidos. Se muestran{' '}
                    {reductionNotice.achieved} tópicos.
                  </Text>
                </View>
              )}

              <View className="flex-row gap-2">
                <StatTile
                  icon={<FileText size={15} color="#4f46e5" />}
                  label="Documentos"
                  value={topics.document_count.toLocaleString()}
                />
                <StatTile
                  icon={<Hash size={15} color="#4f46e5" />}
                  label="Tópicos"
                  value={String(topics.topic_count)}
                />
                <StatTile
                  muted
                  icon={<AlertCircle size={15} color="#64748b" />}
                  label="Atípicos"
                  value={`${topics.outlier_percentage.toFixed(1)}%`}
                />
              </View>

              <View className="rounded-xl border border-slate-200 bg-white">
                <View className="px-4 pb-2 pt-4">
                  <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0f172a' }}>
                    Principales tópicos
                  </Text>
                  <Text className="mt-0.5 text-xs text-slate-500">
                    Los tópicos están ordenados según su presencia en el corpus. Tocá uno para ver
                    más información.
                  </Text>
                </View>
                <View className="gap-2 px-4 pb-4">
                  {topics.topics.map((topic) => (
                    <TopicRanking
                      key={topic.topic_id}
                      topic={topic}
                      selected={topic.topic_id === selectedTopicId}
                      onPress={() => setSelectedTopicId(topic.topic_id)}
                    />
                  ))}
                </View>
              </View>
            </>
          ) : (
            <View className="items-center rounded-xl border border-slate-200 bg-white px-6 py-14">
              <View className="size-14 items-center justify-center rounded-2xl bg-indigo-50">
                {estado === 'running' ? (
                  <ActivityIndicator size="large" color="#4f46e5" />
                ) : (
                  <Layers size={24} color="#4f46e5" />
                )}
              </View>
              <Text
                className="mt-4 text-center text-sm text-slate-900"
                style={{ fontFamily: 'Inter_500Medium' }}
              >
                {error ??
                  (estado === 'running'
                    ? 'Esperando resultados…'
                    : 'Esta operación no se ejecuta automáticamente')}
              </Text>
              <Text className="mt-1 max-w-md text-center text-sm text-slate-500">
                {error
                  ? 'Revisá la conexión y volvé a extraer los tópicos.'
                  : estado === 'running'
                    ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
                    : IDLE_HINT}
              </Text>
              <View className="mt-4 w-full">
                <Boton
                  titulo={estado === 'running' ? 'Ejecutando…' : 'Extraer tópicos'}
                  onPress={ejecutarTopicModeling}
                  deshabilitado={estado === 'running'}
                />
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={selectedTopic !== undefined}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTopicId(null)}
      >
        {selectedTopic && (
          <View className="flex-1 justify-end bg-black/40">
            <View className="max-h-[88%] rounded-t-3xl bg-white">
              <View className="flex-row items-start justify-between gap-4 px-5 pt-5">
                <View className="min-w-0 flex-1">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text
                      className="text-slate-900"
                      style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, flexShrink: 1 }}
                    >
                      {selectedTopic.title ?? `Tópico ${selectedTopic.topic_id + 1}`}
                    </Text>
                    <View className="rounded-md bg-slate-100 px-2 py-0.5">
                      <Text className="text-[11px] text-slate-600">
                        {selectedTopic.percentage.toFixed(1)}%
                      </Text>
                    </View>
                    {selectedTopic.title_source === 'llm' && (
                      <View className="rounded-md border border-slate-200 px-2 py-0.5">
                        <Text className="text-[11px] text-slate-600">IA</Text>
                      </View>
                    )}
                  </View>
                  <Text className="mt-1 text-xs text-slate-500">
                    {selectedTopic.document_count.toLocaleString()} documentos pertenecen a este
                    tópico.
                  </Text>
                </View>
                <Pressable onPress={() => setSelectedTopicId(null)} className="rounded-lg p-1.5">
                  <X size={18} color="#0f172a" />
                </Pressable>
              </View>

              <ScrollView
                className="px-5"
                contentContainerStyle={{ paddingTop: 12, paddingBottom: 36 }}
                showsVerticalScrollIndicator={false}
              >
                <Text
                  className="mb-2 text-sm text-slate-900"
                  style={{ fontFamily: 'Inter_500Medium' }}
                >
                  Términos representativos
                </Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {selectedTopic.keywords.map((keyword, i) => (
                    <View key={i} className="rounded-md border border-slate-200 bg-white px-2 py-0.5">
                      <Text className="text-[11px] text-slate-600">{keyword}</Text>
                    </View>
                  ))}
                </View>

                <View className="mb-2 mt-5">
                  <Text className="text-sm text-slate-900" style={{ fontFamily: 'Inter_500Medium' }}>
                    Documentos representativos
                  </Text>
                  <Text className="text-xs text-slate-500">
                    Algunos documentos representativos de este tópico.
                  </Text>
                </View>
                <View className="gap-3">
                  {selectedTopic.representative_documents.map((document, index) => (
                    <DocumentoExpandible
                      key={document.document_id}
                      document={document}
                      index={index}
                    />
                  ))}
                </View>
              </ScrollView>
            </View>
          </View>
        )}
      </Modal>
    </Screen>
  );
}
