import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Check, Download, FileDown, FileText } from 'lucide-react-native';
import { apiFetch } from '@/lib/api-fetch';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { Boton, CajaError, FUENTE, Screen, Subtitulo, Titulo } from '@/components/ui';
import {
  CATALOGO_REPORTE,
  type DisponiblesReporte,
  type InformeResultado,
} from '@/lib/report/types';
import { descargarInforme } from '@/lib/report/descarga';

// Espejo de TF-U-FRONTEND/components/views/reports-view.tsx.
// En web los gráficos se renderizan ocultos y se serializan a SVG/PNG para
// incluirlos en el PDF; en móvil no hay DOM, así que se omiten y el
// report-service arma los gráficos del PDF desde los datos guardados.

type Estado = 'idle' | 'generando' | 'listo';
type Disponibilidad = { disponible: boolean; detalle: string };

export default function GenerarInformes() {
  const router = useRouter();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [disponibilidad, setDisponibilidad] = useState<Record<string, Disponibilidad>>({});
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [estado, setEstado] = useState<Estado>('idle');
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [informe, setInforme] = useState<{ filename: string; dataset: string | null } | null>(
    null,
  );

  const taskKey = datasetSeleccionado ? `report:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'report',
      jobType: 'report',
      dataset: datasetSeleccionado,
      successMessage: 'Informe generado correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'running') {
        setEstado('generando');
        return;
      }
      consumeTask(task.key);
      if (task.status === 'failed') {
        setEstado('idle');
        return;
      }
      const result = task.result as InformeResultado | undefined;
      setInforme({
        filename: result?.filename ?? `informe_${datasetSeleccionado ?? 'dataset'}.pdf`,
        dataset: datasetSeleccionado,
      });
      setEstado('listo');
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask, datasetSeleccionado]);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      const id = setTimeout(async () => {
        if (!datasetSeleccionado) {
          if (activo) {
            setDisponibilidad({});
            setSeleccion([]);
            setErrorMensaje(null);
            setCargando(false);
          }
          return;
        }
        if (activo) {
          setCargando(true);
          setErrorMensaje(null);
        }
        try {
          const data = await apiFetch<DisponiblesReporte>(
            `/report/disponibles?dataset=${encodeURIComponent(datasetSeleccionado)}`,
            { method: 'GET' },
            { silent: true },
          );
          if (!activo) return;
          const mapa: Record<string, Disponibilidad> = {};
          for (const s of data.secciones ?? []) {
            mapa[s.id] = { disponible: s.disponible, detalle: s.detalle || s.motivo || '' };
          }
          setDisponibilidad(mapa);
          setSeleccion(CATALOGO_REPORTE.filter((c) => mapa[c.id]?.disponible).map((c) => c.id));
        } catch {
          if (!activo) return;
          setDisponibilidad({});
          setSeleccion([]);
          setErrorMensaje('No se pudo obtener los análisis realizados para este dataset.');
        } finally {
          if (activo) setCargando(false);
        }
      }, 0);
      return () => {
        activo = false;
        clearTimeout(id);
      };
    }, [datasetSeleccionado]),
  );

  function toggle(id: string) {
    setSeleccion((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
    setEstado('idle');
  }

  async function generar() {
    if (!datasetSeleccionado || seleccion.length === 0 || !taskKey) return;
    setEstado('generando');
    setErrorMensaje(null);
    try {
      await startTask({
        key: taskKey,
        service: 'report',
        operation: 'generar',
        jobType: 'report',
        dataset: datasetSeleccionado,
        body: { dataset: datasetSeleccionado, secciones: seleccion },
        successMessage: 'Informe generado correctamente.',
      });
    } catch {
      setEstado('idle');
    }
  }

  function descargar() {
    if (!task?.jobId || !informe) return;
    descargarInforme(task.jobId, informe.filename).catch(() => {});
  }

  const informeVisible =
    estado === 'listo' && informe !== null && informe.dataset === datasetSeleccionado;

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-10">
          <View>
            <Titulo>Generar informes</Titulo>
            <Subtitulo>Crea y descarga informes con los resultados del análisis.</Subtitulo>
          </View>

          {!datasetSeleccionado ? (
            <View className="gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Text style={{ fontFamily: FUENTE.regular, fontSize: 14, color: '#64748b' }}>
                Seleccioná un dataset para generar un informe.
              </Text>
              <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
            </View>
          ) : (
            <View className="gap-4 rounded-xl border border-slate-200 bg-white p-4">
              <View className="gap-1">
                <Text style={{ fontFamily: FUENTE.semibold, fontSize: 15, color: '#0f172a' }}>
                  Nuevo informe
                </Text>
                <Text
                  style={{
                    fontFamily: FUENTE.regular,
                    fontSize: 13,
                    lineHeight: 19,
                    color: '#64748b',
                  }}
                >
                  Solo se ofrecen los análisis ya realizados para el dataset seleccionado. El
                  informe no recalcula nada.
                </Text>
              </View>

              <Text style={{ fontFamily: FUENTE.regular, fontSize: 14, color: '#64748b' }}>
                Dataset:{' '}
                <Text style={{ fontFamily: FUENTE.semibold, color: '#0f172a' }}>
                  {datasetSeleccionado}
                </Text>
              </Text>

              <CajaError mensaje={errorMensaje} />

              {cargando ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator size="small" />
                  <Text style={{ fontFamily: FUENTE.regular, fontSize: 14, color: '#64748b' }}>
                    Buscando análisis realizados…
                  </Text>
                </View>
              ) : (
                <View className="gap-2">
                  {CATALOGO_REPORTE.map((s) => {
                    const info = disponibilidad[s.id];
                    const disponible = info?.disponible === true;
                    const activo = seleccion.includes(s.id);
                    return (
                      <TouchableOpacity
                        key={s.id}
                        disabled={!disponible}
                        onPress={() => {
                          if (disponible) toggle(s.id);
                        }}
                        activeOpacity={0.7}
                        className={`flex-row items-center gap-2.5 rounded-lg border px-3 py-2.5 ${
                          !disponible
                            ? 'border-slate-200 opacity-50'
                            : activo
                              ? 'border-indigo-600 bg-indigo-50'
                              : 'border-slate-200'
                        }`}
                      >
                        <View
                          className={`size-4 items-center justify-center rounded border ${
                            activo && disponible
                              ? 'border-indigo-600 bg-indigo-600'
                              : 'border-slate-300'
                          }`}
                        >
                          {activo && disponible && <Check size={11} color="#fff" />}
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            style={{
                              fontFamily: FUENTE.medium,
                              fontSize: 14,
                              color: '#0f172a',
                            }}
                          >
                            {s.titulo}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={{
                              fontFamily: FUENTE.regular,
                              fontSize: 12,
                              color: '#64748b',
                            }}
                          >
                            {disponible
                              ? info?.detalle || 'Listo para incluir'
                              : 'Aún no realizado'}
                          </Text>
                        </View>
                        <View
                          className={`rounded-full px-2 py-0.5 ${
                            disponible ? 'bg-indigo-600' : 'border border-slate-300'
                          }`}
                        >
                          <Text
                            style={{
                              fontFamily: FUENTE.regular,
                              fontSize: 11,
                              color: disponible ? '#fff' : '#475569',
                            }}
                          >
                            {disponible ? 'Listo' : 'Falta'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Pressable
                onPress={generar}
                disabled={seleccion.length === 0 || estado === 'generando'}
                className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 ${
                  seleccion.length === 0 || estado === 'generando'
                    ? 'bg-indigo-300'
                    : 'bg-indigo-600'
                }`}
              >
                {estado === 'generando' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <FileText size={18} color="#fff" />
                )}
                <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                  {estado === 'generando' ? 'Generando…' : 'Generar informe'}
                </Text>
              </Pressable>
            </View>
          )}

          {informeVisible && informe && (
            <View className="gap-3 rounded-xl border border-slate-200 bg-white p-4">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 15, color: '#0f172a' }}>
                Informe generado
              </Text>
              <View className="flex-row items-center gap-3 rounded-lg border border-slate-200 p-3">
                <FileDown size={16} color="#4f46e5" />
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    style={{ fontFamily: FUENTE.medium, fontSize: 14, color: '#0f172a' }}
                  >
                    {informe.filename}
                  </Text>
                  <Text
                    style={{ fontFamily: FUENTE.regular, fontSize: 12, color: '#64748b' }}
                  >
                    PDF · {seleccion.length} secciones
                  </Text>
                </View>
                <View className="rounded-full bg-slate-100 px-2 py-0.5">
                  <Text
                    style={{ fontFamily: FUENTE.regular, fontSize: 11, color: '#475569' }}
                  >
                    PDF
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={descargar}
                  accessibilityLabel="Descargar informe"
                  className="p-2"
                >
                  <Download size={18} color="#0f172a" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
