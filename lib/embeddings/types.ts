// Tipos del endpoint de embeddings — mismo contrato que TF-U-FRONTEND
// components/views/embeddings-view.tsx y TF-U-BACKEND/clustering-service.
export interface EmbeddingsPoint {
  x: number;
  y: number;
  cluster: string;
}

export interface EmbeddingsCluster {
  id: string;
  count: number;
}

export interface EmbeddingsResponse {
  dataset_id: string;
  points: EmbeddingsPoint[];
  clusters: EmbeddingsCluster[];
  total: number;
  displayed: number;
  outliers: number;
  truncated?: boolean;
}

// Misma paleta que la web (embeddings-scatter.tsx): CHART_COLORS + gris de atípicos.
export const COLORES_CLUSTER = ['#2563eb', '#0d9488', '#d97706', '#dc2626', '#9333ea'];

export const COLOR_ATIPICO = '#9ca3af';
