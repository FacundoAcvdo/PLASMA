// Tipos del endpoint de nube de palabras — mismo contrato que
// TF-U-FRONTEND/components/views/wordcloud-view.tsx y wordcloud-service.
export interface WordFreq {
  text: string;
  value: number;
  count: number;
  percentage: number;
  doc_frequency: number;
  doc_percentage: number;
  rank: number;
}

export interface WordCloudResponse {
  dataset_id: string;
  documents_processed: number;
  total_words: number;
  unique_words: number;
  frequencies: WordFreq[];
  max_count: number;
  min_count: number;
}
