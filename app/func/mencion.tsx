import { useEffect, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Check,
  Database,
  Download,
  FileCode2,
  Info,
  Settings2,
  ShieldAlert,
} from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { Boton, CajaError, FUENTE, Screen, Titulo } from '@/components/ui';
import { Selector, type OpcionSelector } from '@/components/Selector';
import {
  BERT_MODELOS,
  C_OPS_LOGREG,
  C_OPS_SVM,
  ENTRENAMIENTO_PRUEBA,
  ITER_OPS,
  METODOS,
  MODELOS,
  NB_SMOOTH_OPS,
  PORCENTAJES_TRAIN,
  RF_DEPTH_OPS,
  RF_EST_OPS,
  RF_LEAF_OPS,
  TAMANO_K,
  VALIDACION_CRUZADA,
  esResultadoClasificador,
  formatearPorcentaje,
  type Modelo,
  type ResumenMenciones,
} from '@/lib/classification/types';
import { descargarModelo } from '@/lib/classification/descarga';

// Espejo de TF-U-FRONTEND/components/views/mention-view.tsx: mismo flujo
// (adopt/start) y mismo contenido. El slider web de % de entrenamiento se
// reemplaza por un selector (5–95, paso 5); el hover/label por tap.

type Estado = 'idle' | 'running' | 'done';

const IDLE_HINT =
  'Entrena un modelo que aprende, a partir de tus datos ya clasificados, a reconocer los mensajes que podrían indicar mención o ideación suicida. Muestra qué tan bien distingue una clase de la otra y permite descargar el modelo para reutilizarlo. Necesita un dataset clasificado para poder entrenarse.';

const ops = (valores: readonly string[]): OpcionSelector[] =>
  valores.map((valor) => ({ valor, etiqueta: valor }));

function CheckRow({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (valor: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => onChange(!checked)}
      activeOpacity={0.7}
      className="flex-row items-start gap-2.5"
    >
      <View
        className={`mt-0.5 size-5 items-center justify-center rounded border ${
          checked ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
        }`}
      >
        {checked && <Check size={13} color="#ffffff" />}
      </View>
      <View className="flex-1">
        <Text className="text-sm text-slate-900">{label}</Text>
        {hint ? <Text className="mt-0.5 text-xs text-slate-500">{hint}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function TiraStat({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <View className="flex-1 items-center rounded-lg border border-slate-200 bg-slate-50/60 px-2 py-2.5">
      <Text className="text-center text-[11px] text-slate-500">{etiqueta}</Text>
      <Text className="mt-0.5 text-sm text-slate-900" style={{ fontFamily: FUENTE.semibold }}>
        {valor.toLocaleString()}
      </Text>
    </View>
  );
}

function Metrica({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <View className="w-[48%] items-center rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5">
      <Text className="text-xs text-slate-500">{etiqueta}</Text>
      <Text className="mt-0.5 text-sm text-slate-900" style={{ fontFamily: FUENTE.semibold }}>
        {formatearPorcentaje(valor)}
      </Text>
    </View>
  );
}

function MatrizConfusion({ resumen }: { resumen: ResumenMenciones }) {
  return (
    <View className="w-full items-center gap-2">
      <Text className="text-center text-xs text-slate-500" style={{ fontFamily: FUENTE.medium }}>
        Matriz de Confusión (Filas: Real, Columnas: Predicha)
      </Text>
      <View className="w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50/40">
        <View className="flex-row">
          <View className="w-24 justify-center border-b border-r border-slate-200 bg-slate-100 px-2 py-2">
            <Text className="text-[10px] text-slate-500" style={{ fontFamily: FUENTE.semibold }}>
              Real \ Predicha
            </Text>
          </View>
          {resumen.clases.map((clase, idx) => (
            <View
              key={`h-${idx}`}
              className="flex-1 justify-center border-b border-r border-slate-200 bg-slate-100 px-1 py-2"
            >
              <Text
                numberOfLines={1}
                className="text-center text-[11px] text-slate-900"
                style={{ fontFamily: FUENTE.medium }}
              >
                {clase}
              </Text>
            </View>
          ))}
        </View>

        {resumen.matriz_confusion.map((fila, i) => (
          <View key={`f-${i}`} className="flex-row">
            <View className="w-24 justify-center border-b border-r border-slate-200 bg-slate-100 px-2 py-2">
              <Text
                numberOfLines={1}
                className="text-[11px] text-slate-900"
                style={{ fontFamily: FUENTE.medium }}
              >
                {resumen.clases[i]}
              </Text>
            </View>
            {fila.map((valor, j) => {
              const esDiagonal = i === j;
              return (
                <View
                  key={`c-${i}-${j}`}
                  className={`flex-1 items-center justify-center border-b border-r border-slate-200 py-2 ${
                    esDiagonal ? 'bg-indigo-50' : valor > 0 ? 'bg-red-50' : 'bg-white'
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      esDiagonal
                        ? 'text-indigo-700'
                        : valor > 0
                          ? 'text-red-600'
                          : 'text-slate-400'
                    }`}
                    style={{ fontFamily: esDiagonal || valor > 0 ? FUENTE.semibold : FUENTE.regular }}
                  >
                    {valor}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

export default function Clasificador() {
  const router = useRouter();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [estado, setEstado] = useState<Estado>('idle');
  const [modeloSeleccionado, setModeloSeleccionado] = useState<Modelo>(MODELOS[0]);
  const [metodo, setMetodo] = useState<string>(VALIDACION_CRUZADA);
  const [valorK, setValorK] = useState<string>(TAMANO_K[0]);
  const [porcentajeTrain, setPorcentajeTrain] = useState<string>('50');

  const [resultado, setResultado] = useState<ResumenMenciones | null>(null);
  const [modelId, setModelId] = useState<string | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string>('modelo.zip');
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [descargando, setDescargando] = useState(false);

  const [modificarParams, setModificarParams] = useState(false);
  const [cLogreg, setCLogreg] = useState('1');
  const [iterLogreg, setIterLogreg] = useState('1000');
  const [cSvm, setCSvm] = useState('1');
  const [iterSvm, setIterSvm] = useState('3000');
  const [nEst, setNEst] = useState('100');
  const [maxDepth, setMaxDepth] = useState('auto');
  const [minLeaf, setMinLeaf] = useState('1');
  const [varSmooth, setVarSmooth] = useState('1e-9');
  const [bertModelo, setBertModelo] = useState('auto');
  const [bertRapido, setBertRapido] = useState(false);

  const taskKey = datasetSeleccionado ? `classification:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  const porcentajeEntrenamiento = Number(porcentajeTrain);
  const porcentajePrueba = 100 - porcentajeEntrenamiento;
  const esBert = modeloSeleccionado === 'BERT';

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'classification',
      jobType: 'classification',
      dataset: datasetSeleccionado,
      successMessage: 'Modelo entrenado correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'succeeded') {
        if (esResultadoClasificador(task.result)) {
          setResultado(task.result.resumen);
          setModelId(task.result.model_id ?? null);
          setNombreArchivo(task.result.nombre_archivo ?? 'modelo.zip');
          setErrorMensaje(null);
          setEstado('done');
        } else {
          setErrorMensaje('El servidor devolvió un resultado incompleto. Volvé a entrenar el modelo.');
          setEstado('idle');
        }
        consumeTask(task.key);
      } else if (task.status === 'failed') {
        setErrorMensaje('No se pudo entrenar el modelo. Intentá nuevamente.');
        setEstado('idle');
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask]);

  const ejecutarEntrenamiento = () => {
    if (!datasetSeleccionado || !taskKey) return;
    setErrorMensaje(null);
    setEstado('running');

    const usaValidacionCruzada = metodo === VALIDACION_CRUZADA;

    let hiperparametros: Record<string, number | string | boolean | null> | undefined;
    if (modificarParams && esBert) {
      hiperparametros = { bert_modelo: bertModelo, bert_rapido: bertRapido };
    }
    if (modificarParams && !esBert) {
      if (modeloSeleccionado === 'Logistic Regression') {
        hiperparametros = { C: Number(cLogreg), max_iter: Number(iterLogreg) };
      } else if (modeloSeleccionado === 'Support Vector Machine') {
        hiperparametros = { C: Number(cSvm), max_iter: Number(iterSvm) };
      } else if (modeloSeleccionado === 'Random Forest') {
        hiperparametros = {
          n_estimators: Number(nEst),
          max_depth: maxDepth === 'auto' ? null : Number(maxDepth),
          min_samples_leaf: Number(minLeaf),
        };
      } else if (modeloSeleccionado === 'Naive Bayes') {
        hiperparametros = { var_smoothing: Number(varSmooth) };
      }
    }

    const body = {
      dataset: datasetSeleccionado,
      modelo: modeloSeleccionado,
      modo: usaValidacionCruzada ? 'validacion_cruzada' : 'porcentajes',
      ...(usaValidacionCruzada
        ? { k: Number(valorK) }
        : { porcentaje_prueba: porcentajePrueba }),
      ...(hiperparametros ? { hiperparametros } : {}),
    };

    startTask({
      key: taskKey,
      service: 'classification',
      operation: 'detectar_menciones',
      jobType: 'classification',
      dataset: datasetSeleccionado,
      body,
      successMessage: 'Modelo entrenado correctamente.',
    }).catch(() => setEstado('idle'));
  };

  const handleReset = () => {
    setResultado(null);
    setModelId(null);
    setErrorMensaje(null);
    setEstado('idle');
  };

  const handleDescargar = async () => {
    if (!modelId) return;
    setDescargando(true);
    try {
      await descargarModelo(modelId, nombreArchivo);
    } finally {
      setDescargando(false);
    }
  };

  if (!datasetSeleccionado) {
    return (
      <Screen>
        <Titulo>Construir clasificador</Titulo>
        <Text className="mb-4 mt-1 text-sm text-slate-500">
          Seleccioná un dataset clasificado para entrenar el modelo.
        </Text>
        <Boton titulo="Elegir dataset" onPress={() => router.push('/datasets')} />
      </Screen>
    );
  }

  const opcionesEntrenamiento = PORCENTAJES_TRAIN.map((valor) => ({
    valor,
    etiqueta: `${valor}% entrenamiento · ${100 - Number(valor)}% prueba`,
  }));

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-4 pb-10">
          <CajaError mensaje={errorMensaje} />

          {resultado ? (
            <>
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <View className="size-2 rounded-full bg-emerald-500" />
                  <Text className="text-sm text-slate-500">Modelo entrenado</Text>
                </View>
                <TouchableOpacity
                  onPress={handleReset}
                  className="flex-row items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2"
                >
                  <Settings2 size={14} color="#0f172a" />
                  <Text className="text-sm text-slate-900">Cambiar configuración</Text>
                </TouchableOpacity>
              </View>

              <View className="rounded-xl border border-slate-200 bg-white">
                <View className="flex-row flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <Text style={{ fontFamily: FUENTE.semibold, fontSize: 14, color: '#0f172a' }}>
                    Resultados del análisis
                  </Text>
                  <View className="flex-row items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1">
                    <Database size={13} color="#64748b" />
                    <Text className="text-xs text-slate-500">
                      Muestras procesadas:{' '}
                      <Text className="text-slate-900" style={{ fontFamily: FUENTE.semibold }}>
                        {resultado.total_muestras.toLocaleString()}
                      </Text>
                    </Text>
                  </View>
                </View>

                <View className="gap-5 px-4 py-5">
                  <View className="flex-row gap-2">
                    <TiraStat etiqueta="Total del dataset" valor={resultado.total_muestras} />
                    <TiraStat etiqueta="Conjunto de entrenamiento" valor={resultado.muestras_train} />
                    <TiraStat etiqueta="Conjunto de prueba / validación" valor={resultado.muestras_test} />
                  </View>

                  <MatrizConfusion resumen={resultado} />

                  <View className="flex-row flex-wrap justify-between gap-2">
                    <Metrica etiqueta="Accuracy" valor={resultado.accuracy} />
                    <Metrica etiqueta="F1 Score" valor={resultado.f1_score} />
                    <Metrica etiqueta="Precision" valor={resultado.precision} />
                    <Metrica etiqueta="Recall" valor={resultado.recall} />
                  </View>
                </View>
              </View>

              <View className="flex-row items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
                  <FileCode2 size={16} color="#4f46e5" />
                  <Text numberOfLines={1} className="flex-1 text-xs text-slate-900">
                    {nombreArchivo}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={handleDescargar}
                  disabled={!modelId || descargando}
                  className={`flex-row items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 ${
                    !modelId || descargando ? 'opacity-50' : ''
                  }`}
                >
                  <Download size={14} color="#0f172a" />
                  <Text className="text-xs text-slate-900">
                    {descargando ? 'Descargando…' : 'Descargar modelo'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              {/* Configuración */}
              <View className="rounded-xl border border-slate-200 bg-white">
                <View className="border-b border-slate-100 px-4 py-4">
                  <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a' }}>
                    Configuración de análisis
                  </Text>
                </View>

                <View className="gap-4 px-4 py-4">
                  <Selector
                    etiqueta="Modelo de análisis"
                    valor={modeloSeleccionado}
                    placeholder="Seleccione un modelo"
                    opciones={ops(MODELOS)}
                    onCambiar={(v) => setModeloSeleccionado(v as Modelo)}
                    deshabilitado={estado !== 'idle'}
                  />

                  <Selector
                    etiqueta="Método de entrenamiento"
                    valor={metodo}
                    placeholder="Seleccione el método"
                    opciones={ops(METODOS)}
                    onCambiar={setMetodo}
                    deshabilitado={estado !== 'idle'}
                  />

                  {metodo === ENTRENAMIENTO_PRUEBA && (
                    <View>
                      <Selector
                        etiqueta="Porcentaje de entrenamiento"
                        valor={porcentajeTrain}
                        opciones={opcionesEntrenamiento}
                        onCambiar={setPorcentajeTrain}
                        deshabilitado={estado !== 'idle'}
                      />
                      <Text className="mt-1.5 text-xs text-slate-500">
                        Entrenamiento: {porcentajeEntrenamiento}% · Prueba: {porcentajePrueba}%
                      </Text>
                    </View>
                  )}

                  {metodo === VALIDACION_CRUZADA && (
                    <Selector
                      etiqueta="Cantidad de pliegues (K)"
                      valor={valorK}
                      placeholder="Seleccione K"
                      opciones={ops(TAMANO_K)}
                      onCambiar={setValorK}
                      deshabilitado={estado !== 'idle'}
                    />
                  )}

                  {esBert && (
                    <View className="flex-row items-start gap-2.5 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5">
                      <Info size={14} color="#64748b" />
                      <Text className="flex-1 text-xs text-slate-500">
                        BERT reentrena la red completa sobre los textos del dataset. Puede demorar
                        bastante tiempo (más aún con validación cruzada) y el archivo resultante pesa
                        cientos de megabytes.
                      </Text>
                    </View>
                  )}

                  <View className="gap-3 rounded-lg border border-slate-200 px-3.5 py-3">
                    <CheckRow
                      checked={modificarParams}
                      onChange={setModificarParams}
                      label="Modificar parámetros"
                    />

                    {modificarParams && esBert && (
                      <View className="gap-3">
                        <Selector
                          etiqueta="Modelo base (auto detecta idioma)"
                          valor={bertModelo}
                          opciones={BERT_MODELOS.map((o) => ({ valor: o.valor, etiqueta: o.etiqueta }))}
                          onCambiar={setBertModelo}
                          deshabilitado={estado !== 'idle'}
                        />
                        <CheckRow
                          checked={bertRapido}
                          onChange={setBertRapido}
                          label="Modo rápido (solo capa final, mucho más veloz)"
                        />
                      </View>
                    )}

                    {modificarParams && modeloSeleccionado === 'Logistic Regression' && (
                      <View className="gap-3">
                        <Selector
                          etiqueta="C (regularización inversa)"
                          valor={cLogreg}
                          opciones={ops(C_OPS_LOGREG)}
                          onCambiar={setCLogreg}
                          deshabilitado={estado !== 'idle'}
                        />
                        <Selector
                          etiqueta="Iteraciones máximas"
                          valor={iterLogreg}
                          opciones={ops(ITER_OPS)}
                          onCambiar={setIterLogreg}
                          deshabilitado={estado !== 'idle'}
                        />
                      </View>
                    )}

                    {modificarParams && modeloSeleccionado === 'Support Vector Machine' && (
                      <View className="gap-3">
                        <Selector
                          etiqueta="C"
                          valor={cSvm}
                          opciones={ops(C_OPS_SVM)}
                          onCambiar={setCSvm}
                          deshabilitado={estado !== 'idle'}
                        />
                        <Selector
                          etiqueta="Iteraciones máximas"
                          valor={iterSvm}
                          opciones={ops(ITER_OPS)}
                          onCambiar={setIterSvm}
                          deshabilitado={estado !== 'idle'}
                        />
                      </View>
                    )}

                    {modificarParams && modeloSeleccionado === 'Random Forest' && (
                      <View className="gap-3">
                        <Selector
                          etiqueta="Cantidad de árboles"
                          valor={nEst}
                          opciones={ops(RF_EST_OPS)}
                          onCambiar={setNEst}
                          deshabilitado={estado !== 'idle'}
                        />
                        <Selector
                          etiqueta="Profundidad máxima"
                          valor={maxDepth}
                          opciones={ops(RF_DEPTH_OPS)}
                          onCambiar={setMaxDepth}
                          deshabilitado={estado !== 'idle'}
                        />
                        <Selector
                          etiqueta="Mínimo de muestras por hoja"
                          valor={minLeaf}
                          opciones={ops(RF_LEAF_OPS)}
                          onCambiar={setMinLeaf}
                          deshabilitado={estado !== 'idle'}
                        />
                      </View>
                    )}

                    {modificarParams && modeloSeleccionado === 'Naive Bayes' && (
                      <Selector
                        etiqueta="Suavizado de varianza"
                        valor={varSmooth}
                        opciones={ops(NB_SMOOTH_OPS)}
                        onCambiar={setVarSmooth}
                        deshabilitado={estado !== 'idle'}
                      />
                    )}
                  </View>
                </View>
              </View>

              {/* Runner */}
              <View className="items-center rounded-xl border border-slate-200 bg-white px-6 py-14">
                <View className="size-14 items-center justify-center rounded-2xl bg-indigo-50">
                  <ShieldAlert size={24} color="#4f46e5" />
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
                    titulo={estado === 'running' ? 'Ejecutando…' : 'Construir modelo'}
                    onPress={ejecutarEntrenamiento}
                    deshabilitado={estado === 'running'}
                  />
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
