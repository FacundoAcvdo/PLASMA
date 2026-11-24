// Contrato espejo de TF-U-BACKEND/classification-service (POST
// /detectar_menciones + GET /jobs/{id}). Mismo contenido que
// TF-U-FRONTEND/components/views/mention-view.tsx.

export const VALIDACION_CRUZADA = 'Validación Cruzada';
export const ENTRENAMIENTO_PRUEBA = 'Entrenamiento y Prueba';

export const METODOS = [VALIDACION_CRUZADA, ENTRENAMIENTO_PRUEBA] as const;

export const TAMANO_K = ['5', '10'] as const;

export const MODELOS = [
  'Logistic Regression',
  'Support Vector Machine',
  'Random Forest',
  'Naive Bayes',
  'BERT',
] as const;

export type Modelo = (typeof MODELOS)[number];

export const C_OPS_LOGREG = ['0.1', '0.5', '1', '2', '5'] as const;
export const C_OPS_SVM = ['0.25', '0.5', '1', '2'] as const;
export const ITER_OPS = ['500', '1000', '2000', '3000'] as const;
export const RF_EST_OPS = ['100', '200', '400'] as const;
export const RF_DEPTH_OPS = ['auto', '10', '20'] as const;
export const RF_LEAF_OPS = ['1', '2'] as const;
export const NB_SMOOTH_OPS = ['1e-9', '1e-8', '1e-7'] as const;

export const BERT_MODELOS = [
  { valor: 'auto', etiqueta: 'Auto (por idioma y equipo)' },
  { valor: 'es_base', etiqueta: 'Español grande' },
  { valor: 'en', etiqueta: 'Inglés' },
] as const;

// El slider web (5–95, paso 5) se reemplaza por un selector con esos valores.
export const PORCENTAJES_TRAIN = Array.from({ length: 19 }, (_, i) => String((i + 1) * 5));

export type ResumenMenciones = {
  truePositive: number;
  falsePositive: number;
  trueNegative: number;
  falseNegative: number;
  accuracy: number;
  f1_score: number;
  precision: number;
  recall: number;
  total_muestras: number;
  muestras_train: number;
  muestras_test: number;
  matriz_confusion: number[][];
  clases: string[];
};

export type ResultadoClasificador = {
  resumen: ResumenMenciones;
  model_id?: string;
  nombre_archivo?: string;
};

export function formatearPorcentaje(valor: number): string {
  const truncado = Math.trunc(Number(valor) * 100 * 100) / 100;
  return `${truncado.toFixed(2)}%`;
}

export function esResultadoClasificador(value: unknown): value is ResultadoClasificador {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const resumen = v.resumen as Record<string, unknown> | undefined;
  if (typeof resumen !== 'object' || resumen === null) return false;
  return (
    Array.isArray(resumen.matriz_confusion) &&
    Array.isArray(resumen.clases) &&
    typeof resumen.accuracy === 'number'
  );
}
