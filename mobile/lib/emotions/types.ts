// Tipos del endpoint de emociones — mismo contrato que
// TF-U-FRONTEND/components/views/emotions-view.tsx y emotions-service.

export interface EmotionStats {
  count: number;
  mean: number;
  std: number;
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  sum?: number;
  top_words?: string[];
}

export type CorpusStats = Record<string, EmotionStats>;

export interface ClassStat {
  clase: string;
  count: number;
  [emotion: string]: EmotionStats | string | number;
}

export interface HistBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface DistributionItem {
  emotion: string;
  stats: {
    count: number;
    mean: number;
    std: number;
    min: number;
    max: number;
    median: number;
    q25: number;
    q75: number;
  };
  histogram: HistBin[];
}

export interface Correlation {
  matrix: number[][];
  order: string[];
  flat: { x: string; y: string; value: number }[];
}

export interface CalidadAnalisis {
  n_textos: number;
  neutral_rate: number;
  low_confidence_rate: number;
  dominant_counts: Record<string, number>;
  n_es: number;
  n_en: number;
}

export interface EmotionsResponse {
  dataset_id: string;
  emotions: string[];
  corpus_stats: CorpusStats;
  class_stats: ClassStat[];
  correlation: Correlation;
  distribution: DistributionItem[];
  top_words: Record<string, string[]>;
  class_top_words: Record<string, Record<string, string[]>>;
  calidad?: CalidadAnalisis | null;
}

export type MetricaClase = 'mean' | 'median' | 'std';

export const ETIQUETA_METRICA: Record<MetricaClase, string> = {
  mean: 'Media',
  median: 'Mediana',
  std: 'Desv. est.',
};

// Traducción al español de las emociones que devuelve el backend (claves en inglés).
const ETIQUETAS_EMOCION: Record<string, string> = {
  anger: 'Enojo',
  disgust: 'Disgusto',
  fear: 'Miedo',
  joy: 'Alegría',
  sadness: 'Tristeza',
  surprise: 'Sorpresa',
  neutral: 'Neutral',
  trust: 'Confianza',
  anticipation: 'Anticipación',
  love: 'Amor',
  optimism: 'Optimismo',
  pessimism: 'Pesimismo',
  contempt: 'Desprecio',
  anxiety: 'Ansiedad',
  fearfulness: 'Temor',
  disgusted: 'Disgustado',
  angry: 'Enojado',
  sad: 'Triste',
  happy: 'Feliz',
  scared: 'Asustado',
};

export function etiquetaEmocion(clave: string | null | undefined): string {
  if (!clave) return '';
  const normalizada = clave.trim().toLowerCase();
  return ETIQUETAS_EMOCION[normalizada] ?? clave;
}
