import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Gauge, RotateCw, TriangleAlert } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch } from '@/lib/api-fetch';
import { Boton, CajaError, FUENTE, Screen, Titulo } from '@/components/ui';
import { Selector } from '@/components/Selector';
import { EvidenciaResaltada, NivelBadge, RiskDonut, TextoResaltado } from '@/components/risk-charts';
import {
  NIVELES,
  NIVEL_META,
  esRespuestaRiesgo,
  type Nivel,
  type RiskResponse,
} from '@/lib/risk/types';

// Espejo de TF-U-FRONTEND/components/views/risk-view.tsx: mismo flujo
// (adopt/start/getResults), estadísticas, donut, desglose y textos relevantes.
// La tabla se vuelve lista de tarjetas; el select de filtro es un Selector.

type Estado = 'idle' | 'running' | 'done';
type Filtro = 'todos' | Nivel;

const IDLE_HINT =
  'Estima el nivel de riesgo suicida de los textos combinando el contenido de los mensajes con un modelo entrenado para esa tarea y revisando con más detalle los casos más preocupantes. Sirve para priorizar qué mensajes conviene mirar primero, como apoyo a la evaluación de un profesional y no como reemplazo.';

function StatCard({
  titulo,
  valor,
  detalle,
  color,
}: {
  titulo: string;
  valor: string;
  detalle: string;
  color?: string;
}) {
  return (
    <View className="w-[48%] rounded-xl border border-slate-200 bg-white p-3.5">
      <Text className="text-xs text-slate-500">{titulo}</Text>
      <Text
        className="mt-0.5"
        style={{ fontFamily: FUENTE.semibold, fontSize: 24, color: color ?? '#0f172a' }}
      >
        {valor}
      </Text>
      <Text className="mt-0.5 text-[11px] text-slate-500">{detalle}</Text>
    </View>
  );
}

export default function NivelRiesgo() {
  const router = useRouter();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [estado, setEstado] = useState<Estado>('idle');
  const [data, setData] = useState<RiskResponse | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const taskKey = datasetSeleccionado ? `risk:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'suicide',
      jobType: 'risk',
      dataset: datasetSeleccionado,
      successMessage: 'Nivel de riesgo estimado correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (esRespuestaRiesgo(task.result)) {
          setData(task.result);
          setErrorMensaje(null);
          setEstado('done');
        } else {
          setErrorMensaje('El servidor devolvió un resultado incompleto. Volvé a estimar el riesgo.');
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setErrorMensaje('No se pudo estimar el nivel de riesgo. Intentá nuevamente.');
        setEstado('idle');
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask]);

  useEffect(() => {
    if (!datasetSeleccionado) return;
    const cargar = async () => {
      setData(null);
      setErrorMensaje(null);
      setEstado('running');
      try {
        const json = await apiFetch<RiskResponse>(
          '/suicide/getResults',
          { method: 'POST', body: JSON.stringify({ dataset: datasetSeleccionado }) },
          { silent: true, ignoreNotFound: true },
        );
        if (!esRespuestaRiesgo(json)) {
          setEstado('idle');
          return;
        }
        setData(json);
        setEstado('done');
      } catch {
        setEstado('idle');
      }
    };
    cargar();
  }, [datasetSeleccionado]);

  const ejecutarRiesgo = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setErrorMensaje(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'suicide',
      operation: 'analyzeRisk',
      jobType: 'risk',
      dataset: datasetSeleccionado,
      body: { dataset: datasetSeleccionado, with_verification: true, top_k: 200 },
      successMessage: 'Nivel de riesgo estimado correctamente.',
    }).catch(() => setEstado('idle'));
  };

  const donut = useMemo(() => {
    if (!data?.resumen) return [];
    const total = data.resumen.total || 1;
    return NIVELES.map((nivel) => ({
      nivel,
      valor: data.resumen!.counts[nivel] ?? 0,
      pct: (((data.resumen!.counts[nivel] ?? 0) / total) * 100).toFixed(1),
      color: NIVEL_META[nivel].color,
    }));
  }, [data]);

  const items = useMemo(() => {
    const todos = data?.top_items ?? [];
    return filtro === 'todos' ? todos : todos.filter((it) => it.nivel === filtro);
  }, [data, filtro]);

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Nivel de riesgo</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset para estimar su nivel de riesgo.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  if (estado !== 'done' || !data) {
    return (
      <Screen>
        <Titulo>Nivel de riesgo</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Nivel de riesgo del dataset: {datasetSeleccionado}
        </Text>
        <CajaError mensaje={errorMensaje} />
        <View className="items-center rounded-xl border border-slate-200 bg-white px-6 py-14">
          <View className="size-14 items-center justify-center rounded-2xl bg-indigo-50">
            {estado === 'running' ? (
              <ActivityIndicator size="large" color="#4f46e5" />
            ) : (
              <Gauge size={24} color="#4f46e5" />
            )}
          </View>
          <Text
            className="mt-4 text-center text-sm text-slate-900"
            style={{ fontFamily: FUENTE.medium }}
          >
            {estado === 'running'
              ? 'Esperando resultados…'
              : 'Esta operación no se ejecuta automáticamente'}
          </Text>
          <Text className="mt-1 max-w-md text-center text-sm text-slate-500">
            {estado === 'running'
              ? 'Podés navegar a otra pantalla: te avisaremos con una notificación cuando termine.'
              : IDLE_HINT}
          </Text>
          <View className="mt-4 w-full">
            <Boton
              titulo={estado === 'running' ? 'Ejecutando…' : 'Estimar nivel de riesgo'}
              onPress={ejecutarRiesgo}
              deshabilitado={estado === 'running'}
            />
          </View>
        </View>
      </Screen>
    );
  }

  const resumen = data.resumen;

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
              onPress={ejecutarRiesgo}
              className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
            >
              <RotateCw size={14} color="#0f172a" />
              <Text className="text-sm text-slate-900">Volver a ejecutar</Text>
            </TouchableOpacity>
          </View>

          {data.disclaimer ? (
            <View className="flex-row items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
              <TriangleAlert size={16} color="#b45309" />
              <View className="flex-1">
                <Text
                  className="text-sm text-amber-900"
                  style={{ fontFamily: FUENTE.semibold }}
                >
                  Aviso: modelo de IA experimental
                </Text>
                <Text className="mt-0.5 text-xs text-amber-800">{data.disclaimer}</Text>
              </View>
            </View>
          ) : null}

          {resumen ? (
            <View className="flex-row flex-wrap justify-between gap-3">
              <StatCard
                titulo="Alto + potencial"
                valor={`${resumen.pct_alto_potencial}%`}
                detalle="Requieren revisión por personal cualificado"
                color="#dc2626"
              />
              <StatCard
                titulo="Documentos analizados"
                valor={resumen.total.toLocaleString()}
                detalle={data.modelo_version ?? 'E5-large + LogReg'}
              />
              <StatCard
                titulo="Puntaje medio"
                valor={String(resumen.score_medio)}
                detalle="P(suicidio) promedio del corpus"
              />
              <StatCard
                titulo="Verificados RoBERTa"
                valor={String(data.verificados_b ?? 0)}
                detalle="Solo casos altos en inglés"
              />
            </View>
          ) : null}

          {/* Distribución */}
          <View className="rounded-xl border border-slate-200 bg-white">
            <View className="px-4 pb-1 pt-4">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                Distribución por nivel de riesgo
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">
                Alto, potencial, medio, bajo y nulo
              </Text>
            </View>
            <View className="items-center px-4 py-4">
              <RiskDonut datos={donut} />
            </View>
          </View>

          {/* Desglose */}
          <View className="rounded-xl border border-slate-200 bg-white">
            <View className="px-4 pb-1 pt-4">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                Desglose
              </Text>
              <Text className="mt-0.5 text-xs text-slate-500">Conteo y porcentaje por nivel</Text>
            </View>
            <View className="gap-3 px-4 py-4">
              {donut.map((n) => (
                <View key={n.nivel} className="gap-1.5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <View
                        className="size-2.5 rounded-full"
                        style={{ backgroundColor: n.color }}
                      />
                      <NivelBadge nivel={n.nivel} />
                    </View>
                    <Text className="text-sm text-slate-500">
                      {n.valor} ({n.pct}%)
                    </Text>
                  </View>
                  <View className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <View
                      className="h-full rounded-full"
                      style={{ width: `${n.pct}%`, backgroundColor: n.color }}
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Textos más relevantes */}
          <View className="rounded-xl border border-slate-200 bg-white">
            <View className="gap-3 border-b border-slate-100 px-4 py-4">
              <View className="flex-row items-center gap-2">
                <Text
                  className="text-sm text-slate-900"
                  style={{ fontFamily: FUENTE.semibold }}
                >
                  Textos más relevantes
                </Text>
                {data.fuente ? (
                  <View className="rounded-md bg-slate-100 px-2 py-0.5">
                    <Text className="text-[11px] text-slate-600">
                      {data.fuente === 'chat' ? 'Chat' : 'Mensajes'}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text className="text-xs text-slate-500">
                {data.fuente === 'chat'
                  ? 'Chunks de conversación con los mensajes de riesgo resaltados'
                  : 'Casos de mayor riesgo con la evidencia resaltada'}
              </Text>

              <Selector
                etiqueta="Nivel"
                valor={filtro}
                opciones={[
                  { valor: 'todos', etiqueta: 'Todos' },
                  ...NIVELES.map((n) => ({ valor: n, etiqueta: n })),
                ]}
                onCambiar={(v) => setFiltro(v as Filtro)}
              />
            </View>

            <View className="gap-3 px-4 py-4">
              {items.length === 0 ? (
                <Text className="py-2 text-sm text-slate-500">Sin casos para este filtro.</Text>
              ) : (
                items.slice(0, 50).map((it) => (
                  <View
                    key={it.doc_id}
                    className="gap-2 rounded-lg border border-slate-200 bg-slate-50/40 p-3"
                  >
                    {it.chunk_index != null && (
                      <View className="flex-row flex-wrap items-center gap-1.5">
                        <View className="rounded-md bg-slate-200 px-1.5 py-0.5">
                          <Text className="text-[10px] text-slate-600">
                            fragmento #{it.chunk_index}
                          </Text>
                        </View>
                        <Text className="text-[11px] text-slate-500">
                          mensajes {it.msg_desde}–{it.msg_hasta}
                        </Text>
                        {(it.fecha_desde || it.fecha_hasta) && (
                          <Text className="text-[11px] text-slate-500">
                            · {it.fecha_desde ?? '?'} → {it.fecha_hasta ?? '?'}
                          </Text>
                        )}
                      </View>
                    )}

                    {it.mensajes_evidencia?.length ? (
                      <View className="gap-1.5">
                        {it.mensajes_evidencia.map((m) => (
                          <View key={m.n} className="rounded-md bg-slate-100 p-2">
                            <Text style={{ fontFamily: FUENTE.regular, fontSize: 14, lineHeight: 21, color: '#0f172a' }}>
                              <Text style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748b' }}>
                                #{m.n}{' '}
                              </Text>
                              <TextoResaltado texto={m.texto} triggers={m.triggers} />
                            </Text>
                          </View>
                        ))}
                        <EvidenciaResaltada texto={it.texto} triggers={[]} />
                      </View>
                    ) : (
                      <EvidenciaResaltada texto={it.texto} triggers={it.triggers} />
                    )}

                    <View className="flex-row flex-wrap items-center justify-between gap-2">
                      <View className="flex-row items-center gap-3">
                        <Text className="text-[11px] text-slate-500">
                          Puntaje A:{' '}
                          <Text style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                            {it.score_a.toFixed(3)}
                          </Text>
                        </Text>
                        <Text className="text-[11px] text-slate-500">
                          RoBERTa:{' '}
                          <Text style={{ fontFamily: 'monospace', color: '#0f172a' }}>
                            {it.score_b != null ? it.score_b.toFixed(3) : '—'}
                          </Text>
                        </Text>
                      </View>
                      <NivelBadge nivel={it.nivel} />
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
