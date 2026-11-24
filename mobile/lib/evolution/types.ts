// Contrato espejo de TF-U-BACKEND/evolution-service (main.py).
// POST /evolution/users → { usuarios, total_mensajes }
// POST /evolution/word-evolution (job) devuelve dos formas:
//  - por fecha: { remitente, granularidad, rango_fechas, total_mensajes, periodos[] }
//  - por bloques: { remitente, granularidad: 'bloques', bloques[] }
// La app normaliza ambas a `periodos`.

export type Usuario = {
  remitente: string;
  cantidad_mensajes: number;
};

export type PalabraTop = {
  palabra: string;
  cantidad: number;
};

export type PeriodoWord = {
  etiqueta: string;
  fecha_inicio: string;
  fecha_fin: string;
  cantidad_mensajes: number;
  palabras_top: PalabraTop[];
};

export type Bloque = {
  cantidad_mensajes: number;
  palabras_top: PalabraTop[];
};

export type EvolucionPalabras = {
  remitente: string;
  granularidad: string;
  rango_fechas?: {
    desde: string;
    hasta: string;
  };
  total_mensajes: number;
  periodos: PeriodoWord[];
};

export type ResultadoEvolucion = {
  remitente: string;
  granularidad: string;
  total_mensajes: number;
  rango_fechas?: {
    desde: string;
    hasta: string;
  };
  periodos?: PeriodoWord[];
  bloques?: Bloque[];
};

/** dd-mm-yyyy → dd/mm/yyyy (espejo de WordEvolutionView.formatearFecha). */
export function formatearFecha(fecha: string): string {
  const partes = fecha.split('-');
  if (partes.length !== 3) return fecha;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

/** Convierte la respuesta de bloques al formato de períodos de la línea de tiempo. */
export function normalizarEvolucion(data: ResultadoEvolucion): EvolucionPalabras {
  if (Array.isArray(data.bloques)) {
    const periodos: PeriodoWord[] = data.bloques.map((b, i) => ({
      etiqueta: `Partición ${i + 1}`,
      fecha_inicio: '',
      fecha_fin: '',
      cantidad_mensajes: b.cantidad_mensajes,
      palabras_top: b.palabras_top,
    }));
    return {
      remitente: data.remitente,
      granularidad: data.granularidad,
      total_mensajes: data.total_mensajes,
      periodos,
    };
  }

  return {
    remitente: data.remitente,
    granularidad: data.granularidad,
    total_mensajes: data.total_mensajes,
    rango_fechas: data.rango_fechas,
    periodos: data.periodos ?? [],
  };
}

export function capitalizar(texto: string): string {
  if (!texto) return texto;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
