import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE } from '@/lib/config';
import { getToken } from '@/lib/api-fetch';
import { NETWORK_ERROR_MESSAGE, errorMessageForStatus } from '@/lib/api-errors';
import { toast } from '@/lib/toast';

// Espejo de reports-view (web): en web es blob + <a download>, en móvil se
// descarga al cache y se abre la hoja nativa para guardar/compartir.
export async function descargarInforme(jobId: string, filename: string): Promise<void> {
  const token = await getToken();
  const url = `${API_BASE}/report/descargar/${encodeURIComponent(jobId)}`;

  let respuesta: Response;
  try {
    respuesta = await expoFetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
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
    mimeType: 'application/pdf',
    dialogTitle: 'Guardar informe',
  });
}
