// Origen: TF-U-FRONTEND/lib/dataset/parsers/xlsx.ts — misma lógica,
// entrada por base64 (expo-file-system) en vez de File.arrayBuffer().
import * as XLSX from 'xlsx'
import type {
  DatasetPreviewData,
} from '../types'
import { analizarFilasCsv } from './csv'

export async function previewXlsxBase64(
  base64: string
): Promise<DatasetPreviewData> {
  const workbook = XLSX.read(base64, {
    type: 'base64',
    cellDates: false,
    cellNF: false,
  })

  const firstSheetName = workbook.SheetNames[0]

  if (!firstSheetName) {
    throw new Error(
      'El archivo Excel no contiene hojas'
    )
  }

  const worksheet =
    workbook.Sheets[firstSheetName]

  const rows =
    XLSX.utils.sheet_to_json<
      Record<string, unknown>
    >(worksheet, {
      defval: '',
      raw: false,
    })

  return analizarFilasCsv(rows)
}
