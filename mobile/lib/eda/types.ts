// Tipos del endpoint de EDA — mismo contrato que TF-U-FRONTEND stats-view.
export interface CorpusStats {
  texto: number;
  vocabulary: number;
  words: number;
  word_avg: number;
  sentences: number;
  sentence_avg: number;
  sentence_min: number;
  sentence_max: number;
}

export interface ClassStats extends CorpusStats {
  clase: string;
}

export interface SentenceStats {
  min: number;
  max: number;
  median: number;
  q25: number;
  q75: number;
  mean: number;
  std: number;
  count: number;
}

export interface SentenceFreqItem {
  sentences: number;
  count: number;
  bin_end?: number;
}

export interface HistBin {
  bin_start: number;
  bin_end: number;
  count: number;
}

export interface DistributionItem {
  clase: string;
  words_histogram: HistBin[];
  sentences_histogram: HistBin[];
  words_stats: Record<string, number>;
  sentences_stats: Record<string, number>;
}

export interface EdaResponse {
  dataset_id: string;
  corpus_stats: CorpusStats;
  class_stats: ClassStats[];
  sentence_stats: SentenceStats;
  sentence_freq: SentenceFreqItem[];
  distribution: DistributionItem[];
}

export const COLORES_SERIE: Record<string, string> = {
  texto: '#2563eb',
  words: '#0d9488',
  sentences: '#d97706',
  vocabulary: '#dc2626',
};

export const COLORES_CLASE = ['#2563eb', '#0d9488', '#d97706', '#dc2626', '#475569'];
