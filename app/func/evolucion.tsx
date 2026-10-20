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
import {
  capitalizar,
  formatearFecha,
  normalizarEvolucion,
  type EvolucionPalabras,
  type PeriodoWord,
  type ResultadoEvolucion,
  type Usuario,
} from '@/lib/evolution/types';

// Espejo de TF-U-FRONTEND/components/views/word-evolution-view.tsx:
// mismo flujo (users + word-evolution job) y mismo contenido.
// La línea de tiempo horizontal se reimplementa en evolution-timeline.tsx.

type Estado = 'idle' | 'running' | 'done';

function WordPeriodCard({ periodo }: { periodo: PeriodoWord }) {
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

      <View className="flex-row flex-wrap gap-1.5 pt-3">
        {periodo.palabras_top.map((p) => (
          <View key={p.palabra} className="rounded-md bg-slate-100 px-2 py-0.5">
            <Text className="text-xs text-slate-700">
              {p.palabra}
              <Text className="text-slate-400"> ({p.cantidad})</Text>
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Evolucion() {
  const router = useRouter();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const [remitenteSeleccionado, setRemitenteSeleccionado] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  const [estado, setEstado] = useState<Estado>('idle');
  const [resultado, setResultado] = useState<EvolucionPalabras | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  const taskKey =
    datasetSeleccionado && remitenteSeleccionado
      ? `word-evolution:${datasetSeleccionado}:${remitenteSeleccionado}`
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
      jobType: 'word-evolution',
      dataset: datasetSeleccionado,
      successMessage: 'Evolución de palabras calculada correctamente.',
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
          setResultado(normalizarEvolucion(task.result as ResultadoEvolucion));
          setErrorMensaje(null);
          setEstado('done');
        } else {
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setErrorMensaje('No se pudo calcular la evolución de palabras. Intentá nuevamente.');
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
      operation: 'word-evolution',
      jobType: 'word-evolution',
      dataset: datasetSeleccionado,
      body: {
        dataset: datasetSeleccionado,
        remitente: remitenteSeleccionado,
        top_k: 10,
      },
      successMessage: 'Evolución de palabras calculada correctamente.',
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
        <Titulo>Evolución de palabras</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset para ver la evolución de palabras de sus participantes.
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
                    Seleccioná un participante para aplicar la evolución de palabras en el tiempo.
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
                      ? `Analiza los mensajes de ${remitenteSeleccionado} y arma una línea de tiempo con sus palabras más usadas en cada período. Sirve para ver cómo cambia su vocabulario con el tiempo y detectar cambios de tema o de estado de ánimo.`
                      : 'Seleccioná un participante para ver cómo cambian sus palabras más usadas a lo largo del tiempo y detectar cambios de tema o de estado de ánimo.'}
                </Text>
                <View className="mt-4 w-full">
                  <Boton
                    titulo={estado === 'running' ? 'Ejecutando…' : 'Ver evolución de palabras'}
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
                      Evolución de palabras
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
                      content: <WordPeriodCard periodo={p} />,
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
