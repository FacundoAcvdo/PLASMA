// Contrato espejo de TF-U-BACKEND/topicmodeling-service (main.py).
// POST /getTopics (job) y POST /getTopicResults (caché) devuelven
// { status, document_count, topic_count, outlier_percentage, reduction, topics }.

export type TopicModelingDocument = {
  document_id: string;
  text: string;
};

export type TopicModelingTopic = {
  topic_id: number;
  document_count: number;
  percentage: number;
  keywords: string[];
  representative_documents: TopicModelingDocument[];
  title?: string;
  title_source?: 'llm' | 'keywords' | 'disabled';
};

export type TopicReduction = {
  requested: number;
  achieved: number;
};

export type TopicModelingResult = {
  document_count: number;
  topic_count: number;
  outlier_percentage: number;
  reduction?: TopicReduction | null;
  topics: TopicModelingTopic[];
};

export const MAX_TOPICS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40];

/** Título del tópico: el generado (IA/plantilla) o sus keywords si no hay. */
export function getTopicTitle(topic: TopicModelingTopic): string {
  if (topic.title && topic.title.trim().length > 0) {
    return topic.title;
  }
  return topic.keywords.slice(0, 3).join(' · ');
}

export function esRespuestaTopics(value: unknown): value is TopicModelingResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.document_count === 'number' &&
    typeof v.topic_count === 'number' &&
    typeof v.outlier_percentage === 'number' &&
    Array.isArray(v.topics)
  );
}
