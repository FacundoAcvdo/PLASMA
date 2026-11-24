import * as SecureStore from 'expo-secure-store';
import { fetch as expoFetch } from 'expo/fetch';
import { API_BASE } from './config';
import { NETWORK_ERROR_MESSAGE, errorMessageForStatus } from './api-errors';
import { toast } from './toast';
import { notifyTermsRequired } from './terms-events';

const TOKEN_KEY = 'access_token';

export async function getToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // almacenamiento no disponible: se sigue sin token persistido
  }
}

export type ApiFetchOptions = {
  silent?: boolean;
  ignoreNotFound?: boolean;
};

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * Fetch centralizado contra el api-gateway (mismo contrato que web).
 * Auth por Bearer desde SecureStore. Errores -> toast + ApiError.
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
  options?: ApiFetchOptions,
): Promise<T> {
  const token = await getToken();
  let respuesta: Response;
  try {
    respuesta = await fetch(API_BASE + path, {
      ...init,
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    if (!options?.silent) toast.error(NETWORK_ERROR_MESSAGE);
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!respuesta.ok) {
    if (respuesta.status === 403) {
      try {
        const clon = respuesta.clone();
        const textoError = await clon.text();
        if (
          textoError.toLowerCase().includes('términos') ||
          textoError.toLowerCase().includes('terminos')
        ) {
          notifyTermsRequired();
        }
      } catch {
        // ignorar error de clonación
      }
    }
    const ignorar = options?.silent || (options?.ignoreNotFound && respuesta.status === 404);
    if (!ignorar) toast.error(errorMessageForStatus(respuesta.status));
    throw new ApiError(respuesta.status, errorMessageForStatus(respuesta.status));
  }

  const texto = await respuesta.text();
  if (!texto) return null as T;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return texto as unknown as T;
  }
}

/**
 * POST multipart con expo/fetch (vía documentada en SDK 58 para enviar
 * File de expo-file-system dentro de FormData: respeta filename y MIME del
 * part). Misma semántica de auth/errores/toast que apiFetch.
 * No fijar Content-Type a mano: expo/fetch genera el boundary.
 */
export async function apiFetchFormData<T = unknown>(
  path: string,
  formData: FormData,
  options?: ApiFetchOptions,
): Promise<T> {
  const token = await getToken();
  let respuesta: Response;
  try {
    respuesta = await expoFetch(API_BASE + path, {
      method: 'POST',
      body: formData,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  } catch {
    if (!options?.silent) toast.error(NETWORK_ERROR_MESSAGE);
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (!respuesta.ok) {
    if (respuesta.status === 403) {
      try {
        const clon = respuesta.clone();
        const textoError = await clon.text();
        if (
          textoError.toLowerCase().includes('términos') ||
          textoError.toLowerCase().includes('terminos')
        ) {
          notifyTermsRequired();
        }
      } catch {
        // ignorar error de clonación
      }
    }
    const ignorar = options?.silent || (options?.ignoreNotFound && respuesta.status === 404);
    if (!ignorar) toast.error(errorMessageForStatus(respuesta.status));
    throw new ApiError(respuesta.status, errorMessageForStatus(respuesta.status));
  }

  const texto = await respuesta.text();
  if (!texto) return null as T;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return texto as unknown as T;
  }
}
