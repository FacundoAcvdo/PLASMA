import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE } from '@/lib/config';
import { getToken } from '@/lib/api-fetch';
import { NETWORK_ERROR_MESSAGE, errorMessageForStatus } from '@/lib/api-errors';
import { toast } from '@/lib/toast';

// Espejo de cleaning-view.handleDownload (web): en web es blob + <a download>,
// en móvil se descarga al cache y se abre la hoja nativa para guardar/compartir.

function mimeDe(nombre: string): string {
  const ext = nombre.slice(nombre.lastIndexOf('.')).toLowerCase();
  if (ext === '.csv') return 'text/csv';
  if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  if (ext === '.xls') return 'application/vnd.ms-excel';
  if (ext === '.txt') return 'text/plain';
  return 'application/octet-stream';
}

export async function descargarDatasetLimpio(downloadId: string, filename: string): Promise<void> {
  const token = await getToken();
  let respuesta: Response;
  try {
    respuesta = await expoFetch(API_BASE + '/datacleaning/download', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ download_id: downloadId }),
    });
  } catch {
    toast.error(NETWORK_ERROR_MESSAGE);
    return;
  }

  if (!respuesta.ok) {
    toast.error(errorMessageForStatus(respuesta.status));
    return;
  }

  const bytes = await respuesta.bytes();
  const archivo = new File(Paths.cache, filename);
  try {
    archivo.create();
  } catch {
    // ya existe: se sobrescribe con write
  }
  await archivo.write(bytes);

  if (!(await Sharing.isAvailableAsync())) {
    toast.error('No se puede guardar el archivo en este dispositivo.');
    return;
  }
  await Sharing.shareAsync(archivo.uri, {
    mimeType: mimeDe(filename),
    dialogTitle: 'Guardar dataset limpio',
  });
}
