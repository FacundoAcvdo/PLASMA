// Origen: TF-U-FRONTEND/lib/dataset/autoConvert.ts — misma lógica.
// En vez de File del navegador: contenido CSV + materialización a caché.
import { previewCsvTexto } from "./parsers/csv"
import type { DatasetPreviewData } from "./types"
import { archivoDesdeTexto, type ArchivoEntrada } from "./archivo"

export type AutoConvertSourceFormat =
  | "whatsapp-chat"
  | "labeled-folders"
  | "unsupported"

export type DatasetOriginalFormat = "csv" | "xlsx" | "txt" | "zip"

export function obtenerFormatoOriginal(
  nombreArchivo: string
): DatasetOriginalFormat {
  const ext = nombreArchivo.split(".").pop()?.toLowerCase()

  if (ext === "csv" || ext === "xlsx" || ext === "txt" || ext === "zip") {
    return ext
  }

  return "csv"
}

export interface AutoConvertedPreviewData extends DatasetPreviewData {
  sourceFormat: AutoConvertSourceFormat
  convertido?: ArchivoEntrada & { materializar: () => Promise<{ uri: string; nombre: string }> }
  notice?: string
}

export function csvEscape(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export function unsupportedPreview(notice: string): AutoConvertedPreviewData {
  return {
    columns: [],
    rows: [],
    totalRows: 0,
    sourceFormat: "unsupported",
    notice,
  }
}

export async function previewConvertedCsv(
  csvContent: string,
  originalName: string,
  sourceFormat: Exclude<AutoConvertSourceFormat, "unsupported">,
  notice: string
): Promise<AutoConvertedPreviewData> {
  const convertido = archivoDesdeTexto(originalName, csvContent)
  const preview = await previewCsvTexto(csvContent)

  return {
    ...preview,
    sourceFormat,
    convertido,
    notice,
  }
}
