// Contrato espejo de TF-U-BACKEND/risk-service (servicio "suicide":
// POST /analyzeRisk + POST /getResults). Mismo contenido que
// TF-U-FRONTEND/components/views/risk-view.tsx.

export type Nivel = 'nulo' | 'bajo' | 'medio' | 'potencial' | 'alto';

export type Span = { texto: string; start: number; end: number; triggers: string[] };

export type MensajeEvidencia = { n: number; texto: string; triggers: string[] };

export type TopItem = {
  doc_id: string;
  texto: string;
  score_a: number;
  score_b: number | null;
  nivel: Nivel;
  spans: Span[];
  triggers: string[];
  chunk_index?: number;
  msg_desde?: number;
  msg_hasta?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  mensajes_evidencia?: MensajeEvidencia[];
};

export type RiskResponse = {
  dataset_id: string;
  fuente?: 'mensajes' | 'chat';
  modelo_version?: string;
  thresholds?: Record<string, number>;
  resumen?: {
    counts: Record<Nivel, number>;
    total: number;
    pct_alto_potencial: number;
    score_medio: number;
  };
  por_clase?: Record<string, { total: number; alto: number; potencial: number }>;
  verificados_b?: number;
  top_items?: TopItem[];
  disclaimer?: string;
};

export const NIVELES: Nivel[] = ['nulo', 'bajo', 'medio', 'potencial', 'alto'];

export const NIVEL_META: Record<Nivel, { color: string; fondo: string; texto: string }> = {
  nulo: { color: '#10b981', fondo: '#d1fae5', texto: '#047857' },
  bajo: { color: '#38bdf8', fondo: '#e0f2fe', texto: '#0369a1' },
  medio: { color: '#f59e0b', fondo: '#fef3c7', texto: '#b45309' },
  potencial: { color: '#fb923c', fondo: '#ffedd5', texto: '#c2410c' },
  alto: { color: '#ef4444', fondo: '#fee2e2', texto: '#b91c1c' },
};

export type SegmentoTexto = { texto: string; resaltado: boolean };

/** Divide el texto y marca los tramos que coinciden con algún trigger. */
export function segmentosResaltados(texto: string, triggers: string[]): SegmentoTexto[] {
  if (!triggers.length) return [{ texto, resaltado: false }];
  const escapados = triggers.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const partes = texto.split(new RegExp(`(${escapados.join('|')})`, 'gi'));
  const enMinuscula = new Set(triggers.map((t) => t.toLowerCase()));
  return partes.map((parte) => ({
    texto: parte,
    resaltado: enMinuscula.has(parte.toLowerCase()),
  }));
}

export function esRespuestaRiesgo(value: unknown): value is RiskResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.resumen === 'object' && v.resumen !== null;
}
