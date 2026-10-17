import { File as FSFile, Paths } from 'expo-file-system';

// Abstracción del archivo de entrada (el picker da uri; lo convertido vive en memoria).
export type ArchivoEntrada = {
  nombre: string;
  uri?: string;
  leerTexto(): Promise<string>;
  leerBase64(): Promise<string>;
};

export function archivoDesdeUri(uri: string, nombre: string): ArchivoEntrada {
  return {
    nombre,
    uri,
    async leerTexto() {
      return new FSFile(uri).text();
    },
    async leerBase64() {
      return new FSFile(uri).base64();
    },
  };
}

export function textoABase64(texto: string): string {
  const utf8 = unescape(encodeURIComponent(texto));
  let out = '';
  for (let i = 0; i < utf8.length; i += 3) {
    const a = utf8.charCodeAt(i);
    const b = i + 1 < utf8.length ? utf8.charCodeAt(i + 1) : NaN;
    const c = i + 2 < utf8.length ? utf8.charCodeAt(i + 2) : NaN;
    const n = (a << 16) | ((isNaN(b) ? 0 : b) << 8) | (isNaN(c) ? 0 : c);
    out +=
      B64[(n >> 18) & 63] +
      B64[(n >> 12) & 63] +
      (isNaN(b) ? '=' : B64[(n >> 6) & 63]) +
      (isNaN(c) ? '=' : B64[n & 63]);
  }
  return out;
}

export function archivoDesdeTexto(nombre: string, contenido: string): ArchivoEntrada & {
  materializar: () => Promise<{ uri: string; nombre: string }>;
} {
  const base = nombre.replace(/\.[^./\\]+$/, '');
  const nombreFinal = `${base}.csv`;
  let uriCache: string | null = null;
  return {
    nombre: nombreFinal,
    async leerTexto() {
      return contenido;
    },
    async leerBase64() {
      return textoABase64(contenido);
    },
    async materializar() {
      if (uriCache) return { uri: uriCache, nombre: nombreFinal };
      const destino = new FSFile(Paths.cache, `upload-convertido-${Date.now()}.csv`);
      try {
        destino.create();
      } catch {
        // ya existe: se sobrescribe igual
      }
      await destino.write(contenido);
      uriCache = destino.uri;
      return { uri: destino.uri, nombre: nombreFinal };
    },
  };
}

// Base64 -> texto (para CSVs dentro de zips u otros flujos intermedios).
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export function base64ADecode(b64: string): Uint8Array {
  const limpio = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const bytes: number[] = [];
  let i = 0;
  while (i < limpio.length) {
    const e1 = B64.indexOf(limpio[i++]);
    const e2 = B64.indexOf(limpio[i++]);
    const e3 = B64.indexOf(limpio[i++]);
    const e4 = B64.indexOf(limpio[i++]);
    const n = (e1 << 18) | (e2 << 12) | ((e3 & 63) << 6) | (e4 & 63);
    bytes.push((n >> 16) & 255);
    if (e3 !== 64) bytes.push((n >> 8) & 255);
    if (e4 !== 64) bytes.push(n & 255);
  }
  return new Uint8Array(bytes);
}

export function bytesATexto(bytes: Uint8Array): string {
  let out = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)) as number[]);
  }
  return decodeURIComponent(escape(out));
}
