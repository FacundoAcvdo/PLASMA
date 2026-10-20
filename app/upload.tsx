import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { File as FSFile, Paths } from 'expo-file-system';
import { useQueryClient } from '@tanstack/react-query';
import { useJobs } from '@/context/jobs-context';
import { archivoDesdeUri, bytesATexto, type ArchivoEntrada } from '@/lib/dataset/archivo';
import JSZip from 'jszip';
import {
  obtenerFormatoOriginal,
  type AutoConvertSourceFormat,
  type DatasetOriginalFormat,
} from '@/lib/dataset/autoConvert';
import type { DatasetPreviewData } from '@/lib/dataset/types';
import { etiquetaTipoColumna } from '@/lib/dataset/types';
import { previewDataset } from '@/lib/dataset/preview';
import { detectWhatsappLocale, type WhatsappLocale } from '@/lib/dataset/parsers/txt';
import { DatasetPreview } from '@/components/DatasetPreview';
import { Selector } from '@/components/Selector';
import { Boton, CajaError, CajaExito, Campo, Screen, Subtitulo, Titulo } from '@/components/ui';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

type PosiblePreview = DatasetPreviewData & {
  sourceFormat?: AutoConvertSourceFormat;
  notice?: string;
  convertido?: ArchivoEntrada & {
    materializar: () => Promise<{ uri: string; nombre: string }>;
  };
};

const COLUMNAS_FIJAS: Record<
  Extract<AutoConvertSourceFormat, 'whatsapp-chat' | 'labeled-folders'>,
  { texto: string; clase: string | null; fecha: string | null }
> = {
  'whatsapp-chat': { texto: 'mensaje', clase: null, fecha: 'fecha' },
  'labeled-folders': { texto: 'texto', clase: 'clase', fecha: null },
};

type TipoArchivoEspecial = 'txt' | 'zip';

const CONFIG_ARCHIVO_ESPECIAL: Record<TipoArchivoEspecial, { titulo: string; descripcion: string }> = {
  txt: {
    titulo: 'Archivo de texto detectado',
    descripcion:
      'Solo se permiten archivos de texto que provengan de WhatsApp. Si continuás, el chat se convertirá automáticamente a formato CSV para continuar con los análisis.',
  },
  zip: {
    titulo: 'Archivo comprimido detectado',
    descripcion:
      'Solo se permiten archivos .zip donde cada carpeta de primer nivel represente una clase y contenga archivos .txt con los textos de esa clase. Si continuás, se convertirá automáticamente a formato CSV.',
  },
};

const ETIQUETA_FORMATO: Record<string, string> = {
  'whatsapp-chat': 'WhatsApp → CSV',
  'labeled-folders': 'ZIP → CSV',
};

function tipoArchivoEspecial(nombre: string): TipoArchivoEspecial | null {
  const formato = obtenerFormatoOriginal(nombre);
  return formato === 'txt' || formato === 'zip' ? formato : null;
}

/**
 * Base sanitizada: sin tildes ni caracteres problemáticos para el
 * filesystem o las cabeceras multipart, pero conservando espacios, puntos
 * y mayúsculas para que siga reconocible.
 */
function baseSanitizada(nombreBase: string): string {
  const base = nombreBase.includes('.')
    ? nombreBase.slice(0, nombreBase.lastIndexOf('.'))
    : nombreBase;
  const limpio = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\/:*?"<>|\r\n]+/g, '')
    .replace(/[\s.]+$/g, '')
    .trim()
    .slice(0, 80);
  return limpio || 'dataset';
}

/**
 * Nombre que viaja al backend y se muestra en la app: el original del
 * celular tal cual si ya termina en la extensión real; si no (colas raras
 * del picker, sin extensión), base sanitizada + extensión detectada.
 */
function nombreParaSubida(nombreOriginal: string, ext: string): string {
  const nombre = nombreOriginal.trim();
  if (nombre.toLowerCase().endsWith(`.${ext}`)) {
    return nombre;
  }
  return `${baseSanitizada(nombre)}.${ext}`;
}

/**
 * Sanitiza lo que escribe el usuario para el nombre del dataset: quita lo
 * que rompería el filesystem o las cabeceras multipart, conserva el resto
 * (espacios, tildes, mayúsculas). Nunca toca la extensión.
 */
function sanitizarNombreUsuario(texto: string): string {
  return texto
    .replace(/[\\/:*?"<>|\r\n]+/g, '')
    .replace(/[\s.]+$/g, '')
    .trim()
    .slice(0, 80);
}

const LOCALES: { valor: WhatsappLocale; etiqueta: string; detalle: string }[] = [
  { valor: 'DMY', etiqueta: 'DD/MM/YYYY', detalle: 'ej. 13/08/2026' },
  { valor: 'MDY', etiqueta: 'MM/DD/YYYY', detalle: 'ej. 08/13/2026' },
  { valor: 'YMD', etiqueta: 'YYYY/MM/DD', detalle: 'ej. 2026/08/13' },
];

function FilaSwitch({
  titulo,
  valor,
  deshabilitado,
  onCambiar,
}: {
  titulo: string;
  valor: boolean;
  deshabilitado?: boolean;
  onCambiar: (v: boolean) => void;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
      <Text className="text-sm font-medium text-slate-900">{titulo}</Text>
      <Switch value={valor} disabled={deshabilitado} onValueChange={onCambiar} />
    </View>
  );
}

export default function Upload() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { tasks, startTask, adoptTask, consumeTask } = useJobs();

  const [archivo, setArchivo] = useState<ArchivoEntrada | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [nombreDataset, setNombreDataset] = useState('Dataset');
  const [preview, setPreview] = useState<PosiblePreview | null>(null);
  const [estado, setEstado] = useState<'idle' | 'cargando' | 'listo'>('idle');
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [columnaTexto, setColumnaTexto] = useState('');
  const [columnaClase, setColumnaClase] = useState('');
  const [sinClasificar, setSinClasificar] = useState(false);
  const [esDeChat, setEsDeChat] = useState(false);
  const [columnaFecha, setColumnaFecha] = useState('');
  const [columnaUsuario, setColumnaUsuario] = useState('');
  const [formatoAutomatico, setFormatoAutomatico] = useState<
    Extract<AutoConvertSourceFormat, 'whatsapp-chat' | 'labeled-folders'> | null
  >(null);
  const [convertido, setConvertido] = useState<PosiblePreview['convertido'] | null>(null);
  const [formatoOriginal, setFormatoOriginal] = useState<DatasetOriginalFormat | null>(null);
  const [especialPendiente, setEspecialPendiente] = useState<{
    archivo: ArchivoEntrada;
    tipo: TipoArchivoEspecial;
  } | null>(null);
  const [textoOriginalTxt, setTextoOriginalTxt] = useState<string | null>(null);
  const [whatsappLocale, setWhatsappLocale] = useState<WhatsappLocale>('DMY');

  const mapeoAutomatico = formatoAutomatico !== null;
  const columnas = preview?.columns ?? [];
  // Extensión real de lo que se va a subir: los convertidos (WhatsApp/ZIP)
  // siempre viajan como .csv; el resto conserva la del archivo.
  const extensionSubida = convertido
    ? 'csv'
    : (archivo?.nombre.split('.').pop()?.toLowerCase() ?? 'csv');

  const taskKey = 'upload';
  const task = tasks[taskKey];

  useEffect(() => {
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
    adoptTask({
      key: taskKey,
      service: 'dataset',
      jobType: 'upload',
      successMessage: 'Dataset cargado correctamente.',
    });
  }, [adoptTask, queryClient]);

  useEffect(() => {
    if (!task || task.consumed) return;
    if (task.status === 'running') {
      setEstado('cargando');
    } else if (task.status === 'succeeded') {
      queryClient.invalidateQueries({ queryKey: ['datasets'] });
      setEstado('listo');
      consumeTask(task.key);
    } else {
      setEstado('idle');
      consumeTask(task.key);
    }
  }, [task, queryClient, consumeTask]);

  function manejarArchivoElegido(entrada: ArchivoEntrada) {
    const tipo = tipoArchivoEspecial(entrada.nombre);
    if (tipo) {
      setEspecialPendiente({ archivo: entrada, tipo });
      return;
    }
    seleccionar(entrada);
  }

  async function seleccionar(entrada: ArchivoEntrada, opts?: { whatsappLocale?: WhatsappLocale }) {
    setArchivo(entrada);
    setNombreArchivo(entrada.nombre);
    setNombreDataset('Dataset');
    setError(null);
    setPreview(null);
    setEstado('idle');
    setFormatoAutomatico(null);
    setConvertido(null);
    setFormatoOriginal(obtenerFormatoOriginal(entrada.nombre));
    setColumnaTexto('');
    setColumnaClase('');
    setColumnaFecha('');
    setColumnaUsuario('');
    setSinClasificar(false);
    setEsDeChat(false);

    let localeOpt = opts?.whatsappLocale;
    let textoTxt: string | null = null;
    if (!localeOpt && obtenerFormatoOriginal(entrada.nombre) === 'txt') {
      try {
        textoTxt = await entrada.leerTexto();
        localeOpt = detectWhatsappLocale(textoTxt);
        setWhatsappLocale(localeOpt);
      } catch {
        localeOpt = 'DMY';
      }
    }
    if (obtenerFormatoOriginal(entrada.nombre) === 'txt' && localeOpt) {
      setWhatsappLocale(localeOpt);
      try {
        textoTxt = textoTxt ?? (await entrada.leerTexto());
      } catch {
        textoTxt = null;
      }
    }
    setTextoOriginalTxt(textoTxt);

    setCargandoPreview(true);
    try {
      const result = (await previewDataset(
        entrada,
        localeOpt ? { whatsappLocale: localeOpt } : undefined,
      )) as PosiblePreview;

      if (result.sourceFormat === 'unsupported') {
        setError(result.notice ?? 'No se pudo reconocer el contenido del archivo.');
        setArchivo(null);
        setNombreArchivo(null);
        setPreview(null);
        return;
      }

      setPreview(result);

      if (result.sourceFormat === 'whatsapp-chat' || result.sourceFormat === 'labeled-folders') {
        const fijas = COLUMNAS_FIJAS[result.sourceFormat];
        setFormatoAutomatico(result.sourceFormat);
        setConvertido(result.convertido ?? null);
        setColumnaTexto(fijas.texto);
        setColumnaClase(fijas.clase ?? '');
        setSinClasificar(fijas.clase === null);
        setEsDeChat(fijas.fecha !== null);
        setColumnaFecha(fijas.fecha ?? '');
        return;
      }

      if (result.textColumn) setColumnaTexto(result.textColumn);
      if (result.classColumn) setColumnaClase(result.classColumn);
      const colFecha = result.columns.find((c) => c.type === 'date');
      if (colFecha) setColumnaFecha(colFecha.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo leer el archivo');
      setArchivo(null);
      setNombreArchivo(null);
      setPreview(null);
    } finally {
      setCargandoPreview(false);
    }
  }

  async function regenerarConLocale(nuevo: WhatsappLocale) {
    if (!textoOriginalTxt) return;
    setWhatsappLocale(nuevo);
    setCargandoPreview(true);
    setError(null);
    try {
      const { previewTxtTexto } = await import('@/lib/dataset/parsers/txt');
      const result = (await previewTxtTexto(textoOriginalTxt, nombreArchivo ?? 'chat.txt', {
        locale: nuevo,
      })) as PosiblePreview;
      if (result.sourceFormat === 'unsupported') {
        setError(result.notice ?? 'No se pudo reconocer el contenido del archivo.');
        return;
      }
      setPreview(result);
      if (result.sourceFormat === 'whatsapp-chat' || result.sourceFormat === 'labeled-folders') {
        const fijas = COLUMNAS_FIJAS[result.sourceFormat];
        setFormatoAutomatico(result.sourceFormat);
        setConvertido(result.convertido ?? null);
        setColumnaTexto(fijas.texto);
        setColumnaClase(fijas.clase ?? '');
        setSinClasificar(fijas.clase === null);
        setEsDeChat(fijas.fecha !== null);
        setColumnaFecha(fijas.fecha ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo regenerar la vista previa');
    } finally {
      setCargandoPreview(false);
    }
  }

  function quitarArchivo() {
    setArchivo(null);
    setNombreArchivo(null);
    setNombreDataset('Dataset');
    setPreview(null);
    setError(null);
    setColumnaTexto('');
    setColumnaClase('');
    setColumnaFecha('');
    setColumnaUsuario('');
    setSinClasificar(false);
    setEsDeChat(false);
    setFormatoAutomatico(null);
    setConvertido(null);
    setFormatoOriginal(null);
    setTextoOriginalTxt(null);
    setWhatsappLocale('DMY');
    setEspecialPendiente(null);
    setEstado('idle');
  }

  async function elegirArchivo() {
    try {
      const picked = await FSFile.pickFileAsync();
      if (picked.canceled || !picked.result) return;
      const rawName = picked.result.name || 'archivo';
      let ext = (picked.result.extension || '').replace(/^\./, '').toLowerCase();
      if (!ext) {
        const partes = rawName.split('.');
        if (partes.length > 1) ext = (partes.pop() ?? '').toLowerCase();
      }
      if (!['csv', 'xlsx', 'txt', 'zip'].includes(ext)) {
        // El picker no dio extensión útil: oler el contenido.
        try {
          ext = await detectarPorContenido(picked.result.uri);
        } catch (e) {
          setError(e instanceof Error ? e.message : 'No se pudo reconocer el contenido del archivo.');
          return;
        }
      }
      // Copiar a caché con nombre de disco sanitizado (ej. colas ".4054"
      // del picker que el backend rechaza con 422). El nombre que ve el
      // usuario y viaja al backend es el original cuando ya es válido
      // (expo/fetch respeta el filename del FormData).
      const nombreSubida = nombreParaSubida(rawName, ext);
      const destino = new FSFile(Paths.cache, `${baseSanitizada(rawName)}.${ext}`);
      try {
        if (destino.exists) destino.delete();
      } catch {
        // si no se pudo borrar, copy lo intentará igual
      }
      await new FSFile(picked.result.uri).copy(destino);
      setError(null);
      manejarArchivoElegido(archivoDesdeUri(destino.uri, nombreSubida));
    } catch {
      setError('No se pudo abrir el selector de archivos.');
    }
  }

  async function detectarPorContenido(uri: string): Promise<'csv' | 'xlsx' | 'txt' | 'zip'> {
    const bytes = await new FSFile(uri).bytes();
    if (bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b) {
      try {
        const zip = await JSZip.loadAsync(bytes);
        const nombres = Object.keys(zip.files);
        if (nombres.some((n) => n.startsWith('xl/'))) return 'xlsx';
        if (nombres.some((n) => n.includes('/') && n.toLowerCase().endsWith('.txt'))) return 'zip';
      } catch {
        // sigue abajo: no es un zip válido
      }
      throw new Error('No se pudo reconocer el contenido del archivo.');
    }
    const texto = bytesATexto(bytes.slice(0, 20000));
    const { isWhatsappChat } = await import('@/lib/dataset/parsers/txt');
    if (isWhatsappChat(texto)) return 'txt';
    return 'csv';
  }

  async function cargar() {
    if (!archivo || estado !== 'idle') return;
    setEstado('cargando');
    setError(null);
    try {
      let archivoAEnviar: { uri: string; nombre: string };
      if (convertido) {
        archivoAEnviar = await convertido.materializar();
      } else if (archivo.uri) {
        archivoAEnviar = { uri: archivo.uri, nombre: archivo.nombre };
      } else {
        setEstado('idle');
        return;
      }
      const formData = new FormData();
      // Nombre final elegido por el usuario (defecto "Dataset"), con la
      // extensión real bloqueada. expo/fetch arma el `filename` multipart a
      // partir del `.name` nativo del File, que es de solo lectura y deriva
      // del nombre en disco; el 3er argumento de append solo aplica a Blobs
      // reales (un File de expo-file-system no lo es). Por eso copiamos a
      // caché con el nombre final para que el backend reciba ese nombre.
      const baseFinal = sanitizarNombreUsuario(nombreDataset) || 'Dataset';
      const nombreFinal = `${baseFinal}.${extensionSubida}`;
      const destino = new FSFile(Paths.cache, nombreFinal);
      try {
        if (destino.exists) destino.delete();
        await new FSFile(archivoAEnviar.uri).copy(destino);
      } catch {
        // si no se pudo renombrar en caché, se sube con el nombre original
      }
      const uriEnvio = destino.exists ? destino.uri : archivoAEnviar.uri;
      formData.append('archivo', new FSFile(uriEnvio) as unknown as Blob, nombreFinal);
      formData.append('columnaTexto', columnaTexto);
      if (!sinClasificar && columnaClase) formData.append('columnaClase', columnaClase);
      if (esDeChat && columnaFecha) formData.append('columnaFecha', columnaFecha);
      if (esDeChat && formatoAutomatico !== 'whatsapp-chat' && columnaUsuario) {
        formData.append('columnaUsuario', columnaUsuario);
      }
      if (formatoOriginal) formData.append('formatoOriginal', formatoOriginal);
      if (formatoAutomatico) formData.append('formatoDetectado', formatoAutomatico);
      if (esDeChat && columnaFecha) formData.append('formatoFecha', whatsappLocale);
      formData.append('esChat', String(esDeChat));
      await startTask({
        key: taskKey,
        service: 'dataset',
        operation: 'uploadDataset',
        jobType: 'upload',
        formData,
        successMessage: 'Dataset cargado correctamente.',
      });
    } catch {
      setEstado('idle');
    }
  }

  const puedeCargar =
    archivo !== null &&
    preview !== null &&
    !cargandoPreview &&
    estado === 'idle' &&
    columnaTexto !== '' &&
    (sinClasificar || columnaClase !== '') &&
    (!esDeChat || columnaFecha !== '') &&
    (!esDeChat || formatoAutomatico === 'whatsapp-chat' || columnaUsuario !== '');

  const opcionesColumnas = columnas.map((c) => ({
    valor: c.name,
    etiqueta: `${c.name} (${etiquetaTipoColumna(c.type)})`,
  }));

  return (
    <Screen>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <View className="gap-4 pb-10">
        <Titulo>Cargar dataset</Titulo>
        <Subtitulo>CSV, XLSX, TXT (WhatsApp), ZIP (carpetas por clase) · máx. 50 MB</Subtitulo>

        <Modal visible={especialPendiente !== null} transparent animationType="fade">
          <View className="flex-1 items-center justify-center bg-black/50 px-6">
            <View className="w-full rounded-2xl bg-white p-5">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 17, color: '#0f172a', marginBottom: 8 }}>
                {especialPendiente ? CONFIG_ARCHIVO_ESPECIAL[especialPendiente.tipo].titulo : ''}
              </Text>
              <Text className="mb-5 text-sm leading-relaxed text-slate-600">
                {especialPendiente ? CONFIG_ARCHIVO_ESPECIAL[especialPendiente.tipo].descripcion : ''}
              </Text>
              <Boton
                titulo="Convertir y continuar"
                onPress={() => {
                  const p = especialPendiente;
                  setEspecialPendiente(null);
                  if (p) {
                    setArchivo(p.archivo);
                    setNombreArchivo(p.archivo.nombre);
                    seleccionar(p.archivo);
                  }
                }}
              />
              <View className="mt-2">
                <Boton titulo="Cancelar" onPress={() => setEspecialPendiente(null)} />
              </View>
            </View>
          </View>
        </Modal>

        <Boton titulo={nombreArchivo ? `Archivo: ${nombreArchivo}` : 'Elegir archivo'} onPress={elegirArchivo} />

        {formatoAutomatico && (
          <View className="rounded-lg bg-indigo-50 px-3 py-2">
            <Text className="text-xs font-semibold text-indigo-700">
              {ETIQUETA_FORMATO[formatoAutomatico]}
            </Text>
          </View>
        )}

        <CajaError mensaje={error} />

        {cargandoPreview && (
          <View className="flex-row items-center gap-2">
            <ActivityIndicator />
            <Text className="text-sm text-slate-500">Leyendo archivo…</Text>
          </View>
        )}

        {preview && (
          <View>
            <DatasetPreview preview={preview} />
          </View>
        )}

        {preview && (
          <View>
            <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0f172a', marginBottom: 6 }}>
              Nombre del dataset
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={nombreDataset}
                onChangeText={(t) => setNombreDataset(sanitizarNombreUsuario(t))}
                placeholder="Dataset"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                style={{ fontFamily: 'Inter_400Regular', fontSize: 14, color: '#0f172a' }}
                className="h-12 flex-1 rounded-lg border border-slate-200 bg-white px-4"
              />
              <View className="h-12 items-center justify-center rounded-lg bg-slate-100 px-3">
                <Text className="text-sm text-slate-500">.{extensionSubida}</Text>
              </View>
            </View>
          </View>
        )}

        {mapeoAutomatico && (
          <View className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Text className="text-xs text-slate-500">
              {formatoAutomatico === 'whatsapp-chat'
                ? 'Este dataset se generó automáticamente a partir de un chat de WhatsApp, así que el mapeo de columnas queda fijo.'
                : 'Este dataset se generó automáticamente a partir de las carpetas del .zip, así que el mapeo de columnas queda fijo.'}
            </Text>
          </View>
        )}

        {formatoAutomatico === 'whatsapp-chat' && (
          <Selector
            etiqueta="Formato de fecha en el .txt original"
            valor={whatsappLocale}
            opciones={LOCALES.map((l) => ({ valor: l.valor, etiqueta: `${l.etiqueta} — ${l.detalle}` }))}
            onCambiar={(v) => regenerarConLocale(v as WhatsappLocale)}
            deshabilitado={!preview || cargandoPreview}
          />
        )}

        <Selector
          etiqueta="Columna de texto"
          valor={columnaTexto}
          placeholder="Seleccionar columna"
          opciones={opcionesColumnas}
          onCambiar={setColumnaTexto}
          deshabilitado={!preview || mapeoAutomatico}
        />

        <Selector
          etiqueta="Columna de clase"
          valor={columnaClase}
          placeholder="Seleccionar columna"
          opciones={opcionesColumnas.filter((o) => o.valor !== columnaTexto)}
          onCambiar={setColumnaClase}
          deshabilitado={!preview || sinClasificar || mapeoAutomatico}
        />

        <FilaSwitch
          titulo="El archivo no está clasificado"
          valor={sinClasificar}
          deshabilitado={mapeoAutomatico}
          onCambiar={(v) => {
            setSinClasificar(v);
            if (v) setColumnaClase('');
          }}
        />

        <FilaSwitch
          titulo="El dataset proviene de un chat"
          valor={esDeChat}
          deshabilitado={mapeoAutomatico}
          onCambiar={(v) => {
            setEsDeChat(v);
            if (!v) {
              setColumnaFecha('');
              setColumnaUsuario('');
            }
          }}
        />

        <Selector
          etiqueta="Columna de fecha"
          valor={columnaFecha}
          placeholder="Seleccionar columna"
          opciones={opcionesColumnas}
          onCambiar={setColumnaFecha}
          deshabilitado={!preview || !esDeChat || mapeoAutomatico}
        />

        {esDeChat && formatoAutomatico !== 'whatsapp-chat' && (
          <>
            <Selector
              etiqueta="Columna de usuario"
              valor={columnaUsuario}
              placeholder="Seleccionar columna"
              opciones={opcionesColumnas.filter((o) => o.valor !== columnaTexto)}
              onCambiar={setColumnaUsuario}
              deshabilitado={!preview || !esDeChat}
            />
            <Selector
              etiqueta="Formato de fecha"
              valor={whatsappLocale}
              opciones={LOCALES.map((l) => ({ valor: l.valor, etiqueta: `${l.etiqueta} — ${l.detalle}` }))}
              onCambiar={(v) => setWhatsappLocale(v as WhatsappLocale)}
              deshabilitado={!preview || !esDeChat}
            />
          </>
        )}

        <Boton
          titulo={estado === 'cargando' ? 'Cargando…' : 'Cargar dataset'}
          onPress={cargar}
          deshabilitado={!puedeCargar}
        />

        {archivo && (
          <Boton titulo="Quitar archivo" onPress={quitarArchivo} deshabilitado={estado !== 'idle'} />
        )}

        {estado === 'cargando' && (
          <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-indigo-50 px-4 py-3">
            <ActivityIndicator />
            <Text className="flex-1 text-sm text-indigo-900">
              Esperando resultados… podés seguir navegando, te avisaremos.
            </Text>
          </View>
        )}
        {estado === 'listo' && (
          <CajaExito>
            <Text className="text-sm font-semibold text-emerald-700">Dataset cargado correctamente</Text>
            <Text className="text-sm text-slate-500">
              {preview?.totalRows.toLocaleString('es')} registros · {preview?.columns.length} columnas detectadas.
            </Text>
            <Boton titulo="Ver datasets" onPress={() => router.replace('/datasets')} />
          </CajaExito>
        )}
        </View>
      </KeyboardAwareScrollView>
    </Screen>
  );
}
