import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BrushCleaning, Sparkles } from 'lucide-react-native';
import { useDataset } from '@/context/dataset-context';
import { useJobs } from '@/context/jobs-context';
import { CajaError, Screen, Titulo } from '@/components/ui';
import { LimpiezaConfig } from '@/components/limpieza-config';
import { LimpiezaResultado } from '@/components/limpieza-resultado';
import { descargarDatasetLimpio } from '@/lib/limpieza/descarga';
import type { CleaningConfig, CleaningResult } from '@/lib/limpieza/types';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/cleaning-view.tsx:
// mismo flujo (adopt/start/consume) y mismas validaciones.
// La descarga (web: blob + <a download>) se adapta a la hoja nativa de compartir.

const DEFAULT_CONFIG: CleaningConfig = {
  operations: [],
  emoji_strategy: 'keep',
  hashtag_strategy: 'keep',
  language: 'bilingual',
};

export default function Limpieza() {
  const { colores } = useTema();
  const { datasetSeleccionado } = useDataset();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [config, setConfig] = useState<CleaningConfig>(DEFAULT_CONFIG);
  const [result, setResult] = useState<CleaningResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskKey = datasetSeleccionado ? `clean:${datasetSeleccionado}` : null;
  const task = taskKey ? tasks[taskKey] : undefined;

  useEffect(() => {
    if (!datasetSeleccionado || !taskKey) return;
    adoptTask({
      key: taskKey,
      service: 'datacleaning',
      jobType: 'clean',
      dataset: datasetSeleccionado,
      successMessage: 'Limpieza completada correctamente.',
    });
  }, [datasetSeleccionado, taskKey, adoptTask]);

  useEffect(() => {
    if (!task || task.consumed) return;
    const id = setTimeout(() => {
      if (task.status === 'running') {
        setLoading(true);
      } else if (task.status === 'succeeded') {
        const data = task.result as ({ result?: CleaningResult } & CleaningResult) | null;
        const limpieza = (data?.result ?? data) as CleaningResult | null;
        if (!limpieza || !limpieza.stats) {
          setError('El servidor devolvió un resultado incompleto. Volvé a ejecutar la limpieza.');
          setLoading(false);
          consumeTask(task.key);
          return;
        }
        setResult(limpieza);
        setLoading(false);
        consumeTask(task.key);
      } else {
        setLoading(false);
        consumeTask(task.key);
      }
    }, 0);
    return () => clearTimeout(id);
  }, [task, consumeTask]);

  const handleClean = async () => {
    setError(null);
    setResult(null);

    if (!datasetSeleccionado) {
      setError('No hay ningún dataset seleccionado.');
      return;
    }

    if (config.operations.length === 0) {
      setError('Selecciona al menos una operación de limpieza.');
      return;
    }

    if (config.operations.includes('lemmatization') && !config.language) {
      setError('Debes seleccionar un idioma para utilizar la lematización.');
      return;
    }

    setLoading(true);

    if (!taskKey) {
      setLoading(false);
      return;
    }

    try {
      await startTask({
        key: taskKey,
        service: 'datacleaning',
        operation: 'cleanDataset',
        jobType: 'clean',
        dataset: datasetSeleccionado,
        body: {
          dataset_name: datasetSeleccionado,
          operations: config.operations,
          emoji_strategy: config.emoji_strategy,
          hashtag_strategy: config.hashtag_strategy,
          language: config.language ?? 'bilingual',
        },
        successMessage: 'Limpieza completada correctamente.',
      });
    } catch {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!result?.download_id) return;
    descargarDatasetLimpio(result.download_id, result.filename).catch(() => {});
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="gap-6 pb-10">
          {/* Header */}
          <View className="flex-row items-center gap-3">
            <View className="size-10 items-center justify-center rounded-xl bg-primario-50 dark:bg-primario-950">
              <Sparkles size={20} color={colores.primario} />
            </View>
            <View className="min-w-0 flex-1">
              <Titulo>Limpieza de dataset</Titulo>
              <Text className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                Prepara tus textos antes de analizarlos quitando el ruido que suele afectar los resultados, como mayúsculas mezcladas, enlaces, menciones, puntuación o palabras muy comunes. Elegí las operaciones que necesites: la plataforma se encarga del orden y así mejoran los análisis posteriores.
              </Text>
            </View>
          </View>

          {/* Dataset seleccionado */}
          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-4">
            <Text className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Dataset seleccionado
            </Text>
            <Text className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100" numberOfLines={1}>
              {datasetSeleccionado ?? 'Ningún dataset seleccionado'}
            </Text>
          </View>

          {/* Error */}
          <CajaError mensaje={error} />

          {/* Configuración */}
          <LimpiezaConfig config={config} onChange={setConfig} />

          {/* Acción */}
          <Pressable
            onPress={handleClean}
            disabled={loading}
            className={`flex-row items-center justify-center gap-2 rounded-xl px-6 py-3.5 ${
              loading ? 'bg-primario-300 dark:bg-primario-900' : 'bg-primario dark:bg-primario-500'
            }`}
          >
            <BrushCleaning size={20} color="#fff" />
            <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-base text-white">
              {loading ? 'Limpiando…' : 'Ejecutar limpieza'}
            </Text>
          </Pressable>

          {/* Resultado */}
          {result && <LimpiezaResultado result={result} onDownload={handleDownload} />}
        </View>
      </ScrollView>
    </Screen>
  );
}
