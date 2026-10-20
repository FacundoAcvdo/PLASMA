import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { MessageCircle, Plus, Send } from 'lucide-react-native';
import { Renderer, useMarkdown, type MarkedStyles } from 'react-native-marked';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { Boton, FUENTE, Screen } from '@/components/ui';
import {
  formatearFechaHora,
  type ChatActivo,
  type Mensaje,
  type RespuestaEnvio,
} from '@/lib/chat/types';

// Espejo de TF-U-FRONTEND/components/views/chatbot-view.tsx y
// dataset-chatbot-view.tsx (eran dos vistas casi idénticas).
// datasetName = null → chatbot general; caso contrario, chatbot del dataset.

// Estilos del Markdown del asistente (espejo del render de la web).
const ESTILOS_MD: MarkedStyles = {
  text: { color: '#0f172a', fontSize: 14, lineHeight: 21, fontFamily: FUENTE.regular },
  paragraph: { marginTop: 0, marginBottom: 6 },
  strong: { fontFamily: FUENTE.semibold },
  em: { fontStyle: 'italic' },
  link: { color: '#4f46e5', textDecorationLine: 'underline' },
  blockquote: {
    borderLeftWidth: 2,
    borderLeftColor: '#cbd5e1',
    paddingLeft: 10,
    marginVertical: 4,
  },
  h1: { fontFamily: FUENTE.semibold, fontSize: 18, color: '#0f172a', marginTop: 8, marginBottom: 4 },
  h2: { fontFamily: FUENTE.semibold, fontSize: 16, color: '#0f172a', marginTop: 8, marginBottom: 4 },
  h3: { fontFamily: FUENTE.semibold, fontSize: 14, color: '#0f172a', marginTop: 6, marginBottom: 2 },
  codespan: {
    fontFamily: 'monospace',
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: 'rgba(15,23,42,0.08)',
  },
  code: { backgroundColor: 'rgba(15,23,42,0.06)', borderRadius: 8, padding: 10, marginVertical: 4 },
  codeText: { fontFamily: 'monospace', fontSize: 13, color: '#0f172a' },
  list: { marginVertical: 2 },
  li: { color: '#0f172a', fontSize: 14 },
  hr: { backgroundColor: '#e2e8f0', height: 1, marginVertical: 8 },
};

const TEMA_MD = {
  colors: { code: '#0f172a', link: '#4f46e5', text: '#0f172a', border: '#e2e8f0' },
};

// Render propio de tablas. En pantalla angosta una tabla de 3+ columnas no
// entra sin comprimir el texto, y un ScrollView horizontal anidado rompe el
// scroll vertical del chat (bug de medición de RN). Por eso cada fila se
// muestra como una tarjeta con sus campos, sin scroll interno.
function TablaChat({
  header,
  rows,
}: {
  header: ReactNode[][];
  rows: ReactNode[][][];
}) {
  if (rows.length === 0) return null;

  return (
    <View style={{ marginVertical: 4, gap: 8 }}>
      {rows.map((celdas, r) => (
        <View
          key={`fila-${r}`}
          style={{
            borderWidth: 1,
            borderColor: '#e2e8f0',
            borderRadius: 8,
            backgroundColor: '#f8fafc',
            paddingHorizontal: 12,
            paddingVertical: 10,
            gap: 10,
          }}
        >
          {celdas.map((celda, c) => (
            <View key={`campo-${c}`} style={{ gap: 2 }}>
              {header.length > 1 && header[c] != null && (
                <View style={{ opacity: 0.55 }}>{header[c]}</View>
              )}
              <View>{celda}</View>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

class RendererChat extends Renderer {
  table(header: ReactNode[][], rows: ReactNode[][][]): ReactNode {
    return <TablaChat key={this.getKey()} header={header} rows={rows} />;
  }

  code(
    text: string,
    _language?: string,
    containerStyle?: ViewStyle,
    textStyle?: TextStyle,
  ): ReactNode {
    return (
      <View key={this.getKey()} style={[containerStyle, { minWidth: 0 }]}>
        <Text style={textStyle}>{text}</Text>
      </View>
    );
  }
}

function TextoMarkdown({ contenido }: { contenido: string }) {
  const [renderer] = useState(() => new RendererChat());
  const elementos = useMarkdown(contenido, { styles: ESTILOS_MD, theme: TEMA_MD, renderer });
  return <View>{elementos}</View>;
}

function PuntosEscribiendo() {
  const [a0] = useState(() => new Animated.Value(0));
  const [a1] = useState(() => new Animated.Value(0));
  const [a2] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const valores = [a0, a1, a2];
    const loops = valores.map((valor, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(valor, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(valor, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay((2 - i) * 150),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [a0, a1, a2]);

  const puntos = [a0, a1, a2];
  return (
    <View
      className="flex-row items-center self-start rounded-2xl bg-slate-100 px-4 py-3"
      style={{ gap: 4 }}
    >
      {puntos.map((valor, i) => (
        <Animated.View
          key={i}
          style={{
            width: 6,
            height: 6,
            borderRadius: 3,
            backgroundColor: '#64748b',
            transform: [
              { translateY: valor.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

export function PanelChat({ datasetName = null }: { datasetName?: string | null }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState('');
  const [escribiendo, setEscribiendo] = useState(false);
  const [cargandoChat, setCargandoChat] = useState(true);
  const [hasActiveChat, setHasActiveChat] = useState<boolean | null>(null);
  const [titulo, setTitulo] = useState<string | null>(null);
  const [horasVisibles, setHorasVisibles] = useState<Record<number, boolean>>({});
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);

  const tituloVisible = titulo?.trim() ? titulo : 'Sin título';
  const conDataset = datasetName != null;

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        const path = conDataset
          ? `/rag/chat?dataset_name=${encodeURIComponent(datasetName as string)}`
          : '/rag/chat';
        const data = await apiFetch<ChatActivo>(path, { method: 'GET' }, { ignoreNotFound: true });
        if (!activo) return;
        setMensajes(data.mensajes ?? []);
        setTitulo(data.titulo ?? null);
        setHasActiveChat(true);
      } catch (e) {
        if (!activo) return;
        if (e instanceof ApiError && e.status === 404) {
          setMensajes([]);
          setTitulo(null);
        }
        setHasActiveChat(false);
      } finally {
        if (activo) setCargandoChat(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [conDataset, datasetName]);

  function alCambiarContenido() {
    scrollRef.current?.scrollToEnd({ animated: false });
  }

  function toggleHora(indice: number) {
    setHorasVisibles((prev) => ({ ...prev, [indice]: !prev[indice] }));
  }

  async function iniciarNuevoChat() {
    setCargandoChat(true);
    try {
      const data = await apiFetch<{ titulo?: string | null }>('/rag/chat', {
        method: 'POST',
        body: JSON.stringify(conDataset ? { dataset_name: datasetName } : {}),
      });
      setMensajes([]);
      setTitulo(data?.titulo ?? null);
      setHorasVisibles({});
      setHasActiveChat(true);
    } catch {
      // apiFetch ya avisó del error.
    } finally {
      setCargandoChat(false);
    }
  }

  async function enviar(texto: string) {
    const limpio = texto.trim();
    if (!limpio || escribiendo) return;
    const nowIso = new Date().toISOString();
    setMensajes((m) => [...m, { autor: 'usuario', mensaje: limpio, created_at: nowIso }]);
    setEntrada('');
    setEscribiendo(true);
    try {
      const data = await apiFetch<RespuestaEnvio>('/rag/message', {
        method: 'POST',
        body: JSON.stringify(conDataset ? { mensaje: limpio, dataset_name: datasetName } : { mensaje: limpio }),
      });
      if (data.pregunta?.created_at) {
        setMensajes((prev) => {
          const copy = [...prev];
          for (let i = copy.length - 1; i >= 0; i--) {
            if (copy[i].autor === 'usuario' && copy[i].mensaje === limpio) {
              copy[i] = { ...copy[i], created_at: data.pregunta.created_at };
              break;
            }
          }
          return copy;
        });
      }
      setMensajes((m) => [...m, data.respuesta]);
      if (data.titulo) setTitulo(data.titulo);
      setEscribiendo(false);
    } catch (e) {
      const esRed = e instanceof ApiError && e.status === 0;
      setMensajes((m) => [
        ...m,
        {
          autor: 'asistente',
          mensaje: esRed ? 'Sin conexión con el servidor.' : 'Ocurrió un error al responder. Intenta de nuevo.',
          created_at: new Date().toISOString(),
        },
      ]);
      setEscribiendo(false);
    }
  }

  return (
    <Screen>
      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        {cargandoChat ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ fontFamily: FUENTE.regular, fontSize: 14, color: '#64748b' }}>
              Cargando chat…
            </Text>
          </View>
        ) : !hasActiveChat ? (
          <View className="flex-1 items-center justify-center gap-4 rounded-2xl border border-slate-200 px-6">
            <MessageCircle size={40} color="#94a3b8" />
            <View className="items-center gap-1">
              <Text style={{ fontFamily: FUENTE.medium, fontSize: 14, color: '#0f172a' }}>
                No tienes un chat activo
              </Text>
              <Text
                style={{
                  fontFamily: FUENTE.regular,
                  fontSize: 12,
                  color: '#64748b',
                  textAlign: 'center',
                }}
              >
                Inicia un nuevo chat para consultar al asistente técnico.
              </Text>
            </View>
            <Boton titulo="Iniciar nuevo chat" onPress={iniciarNuevoChat} />
          </View>
        ) : (
          <View className="flex-1">
            <View className="flex-row items-center justify-between gap-2 pb-3">
              <Text
                numberOfLines={1}
                style={{ flex: 1, fontFamily: FUENTE.medium, fontSize: 14, color: '#0f172a' }}
              >
                {tituloVisible}
              </Text>
              <TouchableOpacity
                onPress={iniciarNuevoChat}
                disabled={cargandoChat || escribiendo}
                className={`flex-row items-center rounded-lg border px-3 py-1.5 ${
                  cargandoChat || escribiendo ? 'border-slate-200' : 'border-slate-300'
                }`}
                style={{ gap: 6, opacity: cargandoChat || escribiendo ? 0.5 : 1 }}
              >
                <Plus size={16} color="#0f172a" />
                <Text style={{ fontFamily: FUENTE.medium, fontSize: 13, color: '#0f172a' }}>
                  Nueva sesión
                </Text>
              </TouchableOpacity>
            </View>

            <View className="flex-1 rounded-2xl border border-slate-200">
              <ScrollView
                ref={scrollRef}
                className="flex-1"
                contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 24 }}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
                onContentSizeChange={alCambiarContenido}
              >
                {mensajes.length === 0 && !escribiendo && (
                  <Text
                    style={{
                      fontFamily: FUENTE.regular,
                      fontSize: 14,
                      color: '#94a3b8',
                      textAlign: 'center',
                      paddingVertical: 24,
                    }}
                  >
                    Sin mensajes. Escribe tu primera consulta.
                  </Text>
                )}
                {mensajes.map((m, i) => (
                  <View key={i} className={m.autor === 'usuario' ? 'items-end' : 'items-start'}>
                    <Pressable
                      onPress={() => toggleHora(i)}
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                        m.autor === 'usuario' ? 'bg-indigo-600' : 'bg-slate-100'
                      }`}
                    >
                      {m.autor === 'usuario' ? (
                        <Text
                          style={{
                            fontFamily: FUENTE.regular,
                            fontSize: 14,
                            lineHeight: 21,
                            color: '#ffffff',
                          }}
                        >
                          {m.mensaje}
                        </Text>
                      ) : (
                        <TextoMarkdown contenido={m.mensaje} />
                      )}
                    </Pressable>
                    {horasVisibles[i] && m.created_at ? (
                      <Text
                        className="mt-1"
                        style={{ fontFamily: FUENTE.regular, fontSize: 11, color: '#94a3b8' }}
                      >
                        {formatearFechaHora(m.created_at)}
                      </Text>
                    ) : null}
                  </View>
                ))}
                {escribiendo && (
                  <View className="items-start">
                    <PuntosEscribiendo />
                  </View>
                )}
              </ScrollView>

              <View className="border-t border-slate-200 p-3">
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={entrada}
                    onChangeText={setEntrada}
                    placeholder="Escribe tu consulta…"
                    placeholderTextColor="#94a3b8"
                    editable={!escribiendo}
                    returnKeyType="send"
                    onSubmitEditing={() => enviar(entrada)}
                    blurOnSubmit={false}
                    style={{
                      flex: 1,
                      fontFamily: FUENTE.regular,
                      fontSize: 14,
                      color: '#0f172a',
                    }}
                    className="h-10 rounded-lg border border-slate-200 bg-white px-3"
                  />
                  <TouchableOpacity
                    onPress={() => enviar(entrada)}
                    disabled={!entrada.trim() || escribiendo}
                    className={`h-10 w-10 items-center justify-center rounded-lg ${
                      !entrada.trim() || escribiendo ? 'bg-indigo-300' : 'bg-indigo-600'
                    }`}
                    aria-label="Enviar"
                  >
                    <Send size={18} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
