// Contrato espejo de TF-U-BACKEND/evolution-service (endpoint
// POST /evolution/emotions-evolution). Comparte el servicio y el flujo con
// word-evolution; el resultado trae emociones por período o por bloque.

export type EmotionsMap = Record<string, number>;

export type PeriodoEmocion = {
  etiqueta: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_mensajes: number;
  emotions: EmotionsMap;
};

export type BloqueBackend = {
  etiqueta?: string;
  desde_msg?: number;
  hasta_msg?: number;
  cantidad_mensajes: number;
  cantidad_palabras?: number;
  emotions: EmotionsMap;
};

export type EvolucionEmociones = {
  remitente: string;
  granularidad: string;
  emotions?: string[];
  rango_fechas?: {
    desde: string;
    hasta: string;
  };
  total_mensajes: number;
  periodos: PeriodoEmocion[];
};

export type ResultadoSentimientos = Omit<EvolucionEmociones, 'periodos'> & {
  periodos?: PeriodoEmocion[];
  bloques?: BloqueBackend[];
};

export const EMOCIONES_ORDEN = ['anger', 'disgust', 'fear', 'joy', 'sadness', 'surprise'];

export const formatearPorcentaje = (valor: number) => `${(Number(valor) * 100).toFixed(1)}%`;

export function emocionDominante(emotions: EmotionsMap | undefined): string | null {
  if (!emotions) return null;
  let mejor: string | null = null;
  let mejorValor = -Infinity;
  for (const [emo, valor] of Object.entries(emotions)) {
    const num = Number(valor);
    if (Number.isFinite(num) && num > mejorValor) {
      mejorValor = num;
      mejor = emo;
    }
  }
  return mejor;
}

export function emocionesOrdenadas(
  emotions: EmotionsMap | undefined,
  orden: string[] | undefined,
): { emocion: string; valor: number }[] {
  if (!emotions) return [];
  const claves = Object.keys(emotions);
  const base = Array.isArray(orden) && orden.length > 0 ? orden : EMOCIONES_ORDEN;
  const resto = claves.filter((c) => !base.includes(c));
  return [...base.filter((c) => c in emotions), ...resto].map((emo) => ({
    emocion: emo,
    valor: Number(emotions[emo]) || 0,
  }));
}

/** Convierte la respuesta de bloques al formato de períodos de la línea de tiempo. */
export function normalizarSentimientos(data: ResultadoSentimientos): EvolucionEmociones {
  if (Array.isArray(data.bloques)) {
    const periodos: PeriodoEmocion[] = data.bloques.map((b, i) => ({
      etiqueta: b.etiqueta ?? `Bloque ${i + 1}`,
      fecha_inicio: '',
      fecha_fin: '',
      cantidad_mensajes: b.cantidad_mensajes,
      emotions: b.emotions ?? {},
    }));
    return {
      remitente: data.remitente,
      granularidad: data.granularidad,
      emotions: data.emotions,
      total_mensajes: data.total_mensajes,
      periodos,
    };
  }

  return {
    remitente: data.remitente,
    granularidad: data.granularidad,
    emotions: data.emotions,
    total_mensajes: data.total_mensajes,
    rango_fechas: data.rango_fechas,
    periodos: data.periodos ?? [],
  };
}
