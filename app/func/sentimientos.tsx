import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Check,
  Layers,
  MessageSquare,
  Search,
  Settings2,
  TrendingUp,
  User,
  Users,
} from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { apiFetch } from '@/lib/api-fetch';
import { Boton, CajaError, CampoConIcono, FUENTE, Screen, Titulo } from '@/components/ui';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { EvolutionTimeline } from '@/components/evolution-timeline';
import { etiquetaEmocion } from '@/lib/emotions/types';
import {
  capitalizar,
  formatearFecha,
  type Usuario,
} from '@/lib/evolution/types';
import {
  emocionDominante,
  emocionesOrdenadas,
  formatearPorcentaje,
  normalizarSentimientos,
  type EvolucionEmociones,
  type PeriodoEmocion,
  type ResultadoSentimientos,
} from '@/lib/evolution/sentiment';

// Espejo de TF-U-FRONTEND/components/views/sentiment-time-view.tsx:
// mismo flujo (users + emotions-evolution job) y mismo contenido.
// Reutiliza la línea de tiempo horizontal de evolution-timeline.tsx.

type Estado = 'idle' | 'running' | 'done';

function EmotionPeriodCard({ periodo, orden }: { periodo: PeriodoEmocion; orden?: string[] }) {
  const lista = emocionesOrdenadas(periodo.emotions, orden).sort((a, b) => b.valor - a.valor);
  const dominante = emocionDominante(periodo.emotions);

  return (
    <View className="w-full rounded-xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-start justify-between border-b border-slate-100 pb-3">
        <View className="min-w-0 flex-1 pr-2">
          <Text numberOfLines={1} style={{ fontFamily: FUENTE.semibold, fontSize: 14, color: '#0f172a' }}>
            {periodo.etiqueta}
          </Text>
          {periodo.fecha_inicio ? (
            <Text numberOfLines={1} className="mt-0.5 text-[11px] text-slate-500">
              {formatearFecha(periodo.fecha_inicio)} — {formatearFecha(periodo.fecha_fin)}
            </Text>
          ) : null}
        </View>
        <View className="flex-row items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1">
          <MessageSquare size={13} color="#64748b" />
          <Text className="text-xs text-slate-600">
            {periodo.cantidad_mensajes.toLocaleString()}
          </Text>
        </View>
      </View>

      <View className="gap-2 pt-3">
        {lista.length === 0 ? (
          <Text className="text-xs text-slate-500">Sin emociones para este bloque.</Text>
        ) : (
          <>
            {dominante && (
              <Text className="text-[11px] text-slate-500">
                Predomina{' '}
                <Text className="text-slate-900" style={{ fontFamily: FUENTE.medium }}>
                  {etiquetaEmocion(dominante)}
                </Text>
              </Text>
            )}
            <View className="flex-row flex-wrap gap-1.5">
              {lista.map(({ emocion, valor }) => {
                const esDominante = emocion === dominante;
                return (
                  <View
                    key={emocion}
                    className={`flex-row items-center rounded-md px-2 py-0.5 ${
                      esDominante ? 'bg-indigo-600' : 'bg-slate-100'
                    }`}
                  >
                    <Text className={`text-xs ${esDominante ? 'text-white' : 'text-slate-700'}`}>
                      {etiquetaEmocion(emocion)}
                    </Text>
                    <Text
                      className={`ml-1 text-xs ${esDominante ? 'text-white' : 'text-slate-700'}`}
                      style={{ fontFamily: FUENTE.medium }}
                    >
                      {formatearPorcentaje(valor)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

export default function Sentimientos() {
  const router = useRouter();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const [remitenteSeleccionado, setRemitenteSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [estado, setEstado] = useState<Estado>('idle');
  const [resultado, setResultado] = useState<EvolucionEmociones | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const taskKey =
    datasetSeleccionado && remitenteSeleccionado
      ? `emotions-evolution:${datasetSeleccionado}:${remitenteSeleccionado}`
      : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  useEffect(() => {
    if (!datasetSeleccionado) return;

    let cancelado = false;
    const cargarUsuarios = async () => {
      setCargandoUsuarios(true);
      setErrorUsuarios(null);
      setErrorMensaje(null);
      setUsuarios([]);
      setRemitenteSeleccionado(null);
      setBusqueda('');
      setResultado(null);
      setEstado('idle');
      try {
        const data = await apiFetch<{ usuarios?: Usuario[] }>('/evolution/users', {
          method: 'POST',
          body: JSON.stringify({ dataset: datasetSeleccionado }),
        });
        if (cancelado) return;
        setUsuarios(Array.isArray(data.usuarios) ? data.usuarios : []);
      } catch {
        if (cancelado) return;
        setErrorUsuarios('No se pudieron obtener los participantes de este dataset.');
      } finally {
        if (!cancelado) setCargandoUsuarios(false);
      }
    };
    cargarUsuarios();
    return () => {
      cancelado = true;
    };
  }, [datasetSeleccionado]);

  useEffect(() => {
    if (!taskKey || !datasetSeleccionado) return;
    adoptTask({
      key: taskKey,
      service: 'evolution',
      jobType: 'emotions-evolution',
      dataset: datasetSeleccionado,
      successMessage: 'Evolución de emociones calculada correctamente.',
    });
  }, [taskKey, datasetSeleccionado, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        // Solo se aplica si el job es del remitente actual; si no, se libera
        // igual (el aviso de éxito ya salió y el botón vuelve a habilitarse).
        const jobRemitente = (task.params as { remitente?: unknown } | null | undefined)?.remitente;
        if (!task.params || jobRemitente === remitenteSeleccionado) {
          setResultado(normalizarSentimientos(task.result as ResultadoSentimientos));
          setErrorMensaje(null);
          setEstado('done');
        } else {
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setErrorMensaje('No se pudo calcular la evolución de emociones. Intentá nuevamente.');
        setEstado('idle');
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask, remitenteSeleccionado]);

  const usuariosFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    if (!texto) return usuarios;
    return usuarios.filter((usuario) => usuario.remitente.toLowerCase().includes(texto));
  }, [usuarios, busqueda]);

  const mostrarBuscador = usuarios.length > 2;
  const configuracionBloqueada = estado !== 'idle';

  const ejecutarEvolucion = () => {
    if (!remitenteSeleccionado || !datasetSeleccionado || !taskKey) return;
    setErrorMensaje(null);
    setEstado('running');
    startTask({
      key: taskKey,
      service: 'evolution',
      operation: 'emotions-evolution',
      jobType: 'emotions-evolution',
      dataset: datasetSeleccionado,
      body: {
        dataset: datasetSeleccionado,
        remitente: remitenteSeleccionado,
      },
      successMessage: 'Evolución de emociones calculada correctamente.',
    }).catch(() => setEstado('idle'));
  };

  const handleReset = () => {
    setResultado(null);
    setErrorMensaje(null);
    setEstado('idle');
  };

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Sentimientos en el tiempo</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset para ver la evolución de emociones de sus participantes.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  return (
    <Screen>
        <KeyboardAwareScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          bottomOffset={20}
        >
        <View className="gap-4 pb-10">
          <CajaError mensaje={errorUsuarios} />
          <CajaError mensaje={errorMensaje} />

          {!resultado ? (
            <>
              {/* Participantes */}
              <View className="rounded-xl border border-slate-200 bg-white">
                <View className="px-4 pb-3 pt-4">
                  <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                    Participantes
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Seleccioná un participante para aplicar la evolución de emociones en el tiempo.
                  </Text>
                </View>

                <View className="px-4 pb-4">
                  {cargandoUsuarios ? (
                    <Text className="py-8 text-center text-sm text-slate-500">
                      Buscando participantes…
                    </Text>
                  ) : usuarios.length === 0 ? (
                    <View className="items-center py-8">
                      <Users size={20} color="#94a3b8" />
                      <Text className="mt-2 text-center text-sm text-slate-500">
                        No se encontraron participantes en este dataset.
                      </Text>
                    </View>
                  ) : (
                    <View className="gap-3">
                      {mostrarBuscador && (
                        <CampoConIcono
                          icono={<Search size={16} color="#94a3b8" />}
                          placeholder="Buscar participante..."
                          value={busqueda}
                          onChangeText={setBusqueda}
                          editable={!configuracionBloqueada}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      )}

                      <View className="rounded-lg border border-slate-200">
                        <ScrollView
                          style={{ maxHeight: 220 }}
                          nestedScrollEnabled
                          className="p-1.5"
                          showsVerticalScrollIndicator
                        >
                          <View className="gap-1">
                            {usuariosFiltrados.map((usuario) => {
                              const seleccionado = remitenteSeleccionado === usuario.remitente;
                              return (
                                <Pressable
                                  key={usuario.remitente}
                                  disabled={configuracionBloqueada}
                                  onPress={() => setRemitenteSeleccionado(usuario.remitente)}
                                  className={`flex-row items-center justify-between gap-3 rounded-md px-3 py-2.5 ${
                                    seleccionado ? 'bg-indigo-600' : 'bg-transparent'
                                  } ${configuracionBloqueada ? 'opacity-60' : ''}`}
                                >
                                  <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                                    <View
                                      className={`size-8 items-center justify-center rounded-full ${
                                        seleccionado ? 'bg-white/20' : 'bg-indigo-50'
                                      }`}
                                    >
                                      <User size={16} color={seleccionado ? '#ffffff' : '#4f46e5'} />
                                    </View>
                                    <View className="min-w-0 flex-1">
                                      <Text
                                        numberOfLines={1}
                                        className={seleccionado ? 'text-white' : 'text-slate-900'}
                                        style={{ fontFamily: FUENTE.medium, fontSize: 14 }}
                                      >
                                        {usuario.remitente}
                                      </Text>
                                      <Text
                                        className={`text-xs ${
                                          seleccionado ? 'text-white/70' : 'text-slate-500'
                                        }`}
                                      >
                                        {usuario.cantidad_mensajes.toLocaleString()} mensajes
                                      </Text>
                                    </View>
                                  </View>

                                  {seleccionado && (
                                    <View className="size-6 items-center justify-center rounded-full bg-white/20">
                                      <Check size={14} color="#ffffff" />
                                    </View>
                                  )}
                                </Pressable>
                              );
                            })}

                            {usuariosFiltrados.length === 0 && (
                              <View className="items-center py-8">
                                <Search size={20} color="#94a3b8" />
                                <Text className="mt-2 text-center text-sm text-slate-500">
                                  No se encontraron participantes.
                                </Text>
                              </View>
                            )}
                          </View>
                        </ScrollView>
                      </View>

                      <View className="flex-row items-center justify-between gap-3 px-1">
                        <Text className="text-xs text-slate-500">
                          {usuarios.length}{' '}
                          {usuarios.length === 1 ? 'participante' : 'participantes'}
                        </Text>
                        {remitenteSeleccionado && (
                          <Text numberOfLines={1} className="shrink text-xs text-slate-500">
                            Seleccionado:{' '}
                            <Text className="text-slate-900" style={{ fontFamily: FUENTE.semibold }}>
                              {remitenteSeleccionado}
                            </Text>
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              </View>

              {/* Runner */}
              <View className="items-center rounded-xl border border-slate-200 bg-white px-6 py-14">
                <View className="size-14 items-center justify-center rounded-2xl bg-indigo-50">
                  <TrendingUp size={24} color="#4f46e5" />
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
                    : remitenteSeleccionado
                      ? `Analiza los mensajes de ${remitenteSeleccionado} y muestra cómo evoluciona su tono emocional (más positivo, neutro o negativo) a lo largo del tiempo. Ayuda a detectar cambios de ánimo sostenidos o momentos de mayor malestar.`
                      : 'Seleccioná un participante para ver cómo evoluciona su tono emocional a lo largo del tiempo y detectar cambios de ánimo sostenidos o momentos de mayor malestar.'}
                </Text>
                <View className="mt-4 w-full">
                  <Boton
                    titulo={estado === 'running' ? 'Ejecutando…' : 'Ver evolución de emociones'}
                    onPress={ejecutarEvolucion}
                    deshabilitado={estado === 'running' || !remitenteSeleccionado}
                  />
                </View>
              </View>
            </>
          ) : (
            /* Resultado */
            <View className="rounded-xl border border-slate-200 bg-white">
              <View className="gap-4 border-b border-slate-100 bg-slate-50 px-4 py-4">
                <View className="gap-1.5">
                  <View className="flex-row flex-wrap items-center gap-2">
                    <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                      Evolución de emociones
                    </Text>
                    <View className="flex-row items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-0.5">
                      <User size={13} color="#4f46e5" />
                      <Text className="text-xs text-slate-600">{resultado.remitente}</Text>
                    </View>
                  </View>

                  <View className="mt-1 flex-row flex-wrap items-center gap-2">
                    <View className="flex-row items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1">
                      <MessageSquare size={13} color="#4f46e5" />
                      <Text className="text-xs text-slate-500">
                        <Text className="text-slate-900" style={{ fontFamily: FUENTE.medium }}>
                          {resultado.total_mensajes.toLocaleString()}
                        </Text>{' '}
                        mensajes
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1">
                      <Calendar size={13} color="#4f46e5" />
                      {resultado.rango_fechas ? (
                        <Text className="text-xs text-slate-500">
                          <Text className="text-slate-900" style={{ fontFamily: FUENTE.medium }}>
                            {formatearFecha(resultado.rango_fechas.desde)}
                          </Text>
                          <Text className="opacity-50"> — </Text>
                          <Text className="text-slate-900" style={{ fontFamily: FUENTE.medium }}>
                            {formatearFecha(resultado.rango_fechas.hasta)}
                          </Text>
                        </Text>
                      ) : (
                        <Text className="text-xs text-slate-500">
                          Sin fechas: partición por bloques
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1">
                      <Layers size={13} color="#4f46e5" />
                      <Text className="text-xs text-slate-500">
                        Partición{' '}
                        <Text className="text-slate-900" style={{ fontFamily: FUENTE.medium }}>
                          {capitalizar(resultado.granularidad)}
                        </Text>
                      </Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={handleReset}
                  className="flex-row items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <Settings2 size={14} color="#0f172a" />
                  <Text className="text-xs text-slate-900">Cambiar participante</Text>
                </Pressable>
              </View>

              <View className="gap-4 px-1 py-5">
                <View className="px-3">
                  <Text className="text-xs text-slate-500" style={{ fontFamily: FUENTE.medium }}>
                    {resultado.rango_fechas ? 'Línea de tiempo horizontal' : 'Particiones por bloques'}
                  </Text>
                  {resultado.periodos.length > 1 && (
                    <Text className="mt-1 text-[11px] text-slate-500">
                      Deslizá horizontalmente para avanzar →
                    </Text>
                  )}
                </View>

                <View className="rounded-lg border border-slate-200 bg-slate-50/50">
                  <EvolutionTimeline
                    items={resultado.periodos.map((p) => ({
                      key: p.etiqueta,
                      content: <EmotionPeriodCard periodo={p} orden={resultado.emotions} />,
                    }))}
                  />
                </View>

                <View className="flex-row items-center justify-between gap-3 px-3">
                  <View className="rounded-full border border-slate-200 bg-slate-100/60 px-3 py-1.5">
                    <Text className="text-xs text-slate-500">
                      {resultado.periodos.length}{' '}
                      {resultado.periodos.length === 1 ? 'período analizado' : 'períodos analizados'}
                    </Text>
                  </View>
                  {resultado.periodos.length > 1 && (
                    <View className="rounded-full border border-slate-200 bg-slate-100/60 px-3 py-1.5">
                      <Text className="text-xs text-slate-600" style={{ fontFamily: FUENTE.medium }}>
                        ← desplazate →
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
