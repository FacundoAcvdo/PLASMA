import type { DatasetPreviewData } from './types'
import { previewCsvTexto } from './parsers/csv'
import { previewXlsxBase64 } from './parsers/xlsx'
import { previewTxtTexto } from './parsers/txt'
import type { WhatsappLocale } from './parsers/txt'
import { previewZipBase64 } from './parsers/zip'
import type { ArchivoEntrada } from './archivo'

export async function previewDataset(
  archivo: ArchivoEntrada,
  options?: { whatsappLocale?: WhatsappLocale }
): Promise<DatasetPreviewData> {
  const extension = archivo.nombre
    .split('.')
    .pop()
    ?.toLowerCase()

  switch (extension) {
    case 'csv':
      return previewCsvTexto(await archivo.leerTexto())

    case 'xlsx':
      return previewXlsxBase64(await archivo.leerBase64())

    case 'txt':
      return previewTxtTexto(await archivo.leerTexto(), archivo.nombre, {
        locale: options?.whatsappLocale,
      })

    case 'zip':
      return previewZipBase64(await archivo.leerBase64(), archivo.nombre)
    default:
      throw new Error(
        `Formato no soportado: .${extension ?? ''}`
      )
  }
}
