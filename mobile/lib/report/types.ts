// Origen: TF-U-FRONTEND/components/views/reports-view.tsx — mantener sincronizado.
export type SeccionReporte = {
  id: string;
  titulo: string;
  detalle: string;
  disponible: boolean;
  motivo: string;
};

export type DisponiblesReporte = {
  dataset: string;
  dataset_id?: string;
  secciones: SeccionReporte[];
};

export type InformeResultado = {
  filename?: string;
  omitidas?: string[];
};

export const CATALOGO_REPORTE: { id: string; titulo: string }[] = [
  { id: 'estadisticas', titulo: 'Estadísticas generales' },
  { id: 'nube', titulo: 'Nube de palabras' },
  { id: 'topicos', titulo: 'Tópicos principales' },
  { id: 'riesgo', titulo: 'Nivel de riesgo' },
  { id: 'sentimiento', titulo: 'Sentimiento en el tiempo' },
  { id: 'evolucion', titulo: 'Evolución de palabras en el tiempo' },
  { id: 'embeddings', titulo: 'Visualización de embeddings' },
  { id: 'chats', titulo: 'Chats del chatbot' },
  { id: 'emociones', titulo: 'Emociones negativas' },
];
