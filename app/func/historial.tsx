import { useCallback, useState } from 'react';
import { FlatList, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Database, History, MessageCircle, Trash2 } from 'lucide-react-native';
import { apiFetch } from '@/lib/api-fetch';
import { useDatasetsQuery } from '@/context/dataset-context';
import { Cargando, FUENTE, Screen, Subtitulo, Titulo } from '@/components/ui';
import { type ChatResumen, type HistorialChats } from '@/lib/chat/types';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/chat-history-view.tsx.
// La fila clickeable (hover en web) se mantiene como tap; el botón de borrar
// de cada fila no propaga el tap (el responder de RN prioriza el más interno).

export default function HistorialDeChats() {
  const { colores } = useTema();
  const router = useRouter();
  const { data: datasets } = useDatasetsQuery();

  const [chats, setChats] = useState<HistorialChats>({ total: 0, chats: [] });
  const [cargando, setCargando] = useState(true);
  const [confirmacion, setConfirmacion] = useState<{
    titulo: string;
    descripcion: string;
    onConfirmar: () => void;
  } | null>(null);

  const buscarChats = useCallback(async () => {
    try {
      const data = await apiFetch<HistorialChats>('/rag/chats', { method: 'GET' }, { silent: true });
      setChats(data);
    } catch {
      // lectura de fondo: sin toast para no spamear; las acciones sí avisan
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let activo = true;
      (async () => {
        await buscarChats();
        if (activo) setCargando(false);
      })();
      return () => {
        activo = false;
      };
    }, [buscarChats]),
  );

  async function eliminar(id: string) {
    try {
      await apiFetch('/rag/chat', {
        method: 'DELETE',
        body: JSON.stringify({ chat_id: id }),
      });
      buscarChats();
    } catch {
      // apiFetch ya mostró el toast de error
    }
  }

  async function eliminarTodos() {
    try {
      await apiFetch('/rag/chats', { method: 'DELETE' });
      buscarChats();
    } catch {
      // apiFetch ya mostró el toast de error
    }
  }

  function pedirEliminar(chat: ChatResumen) {
    setConfirmacion({
      titulo: 'Eliminar chat',
      descripcion: `¿Seguro que quieres eliminar "${
        chat.titulo?.trim() ? chat.titulo : 'Sin título'
      }"? Esta acción no se puede deshacer.`,
      onConfirmar: () => eliminar(chat.chat_id),
    });
  }

  function pedirEliminarTodos() {
    setConfirmacion({
      titulo: 'Eliminar todos los chats',
      descripcion:
        '¿Seguro que quieres eliminar todas las conversaciones? Esta acción no se puede deshacer.',
      onConfirmar: eliminarTodos,
    });
  }

  async function redirigir(chat_id: string, dataset_id: string | null) {
    try {
      await apiFetch('/rag/activate_chat', {
        method: 'POST',
        body: JSON.stringify({ chat_id }),
      });
    } catch {
      // apiFetch ya mostró el toast de error
      return;
    }

    if (dataset_id != null && dataset_id !== '') {
      const dataset = datasets?.find((d) => d.dataset_id === dataset_id);
      if (!dataset) return;
      router.push({
        pathname: '/func/chatbot-dataset',
        params: { dataset_name: dataset.dataset_name },
      });
      return;
    }

    router.push('/func/chatbot');
  }

  if (cargando) return <Cargando texto="Cargando chats…" />;

  return (
    <Screen>
      <FlatList
        data={chats.chats}
        keyExtractor={(item) => item.chat_id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16 }}
        ListHeaderComponent={
          <View>
            <Titulo>Historial de chats</Titulo>
            <Subtitulo>Consulta y elimina conversaciones anteriores.</Subtitulo>
            <View className="mb-3 flex-row items-center justify-between gap-3">
              <Text style={{ fontFamily: FUENTE.medium, fontSize: 15, color: colores.texto }}>
                Conversaciones guardadas
              </Text>
              {chats.total > 0 && (
                <TouchableOpacity
                  onPress={pedirEliminarTodos}
                  className="flex-row items-center gap-1.5 rounded-lg bg-red-600 dark:bg-red-500 px-3 py-2"
                >
                  <Trash2 size={14} color="#fff" />
                  <Text style={{ fontFamily: FUENTE.medium, fontSize: 14, color: '#fff' }}>
                    Eliminar todo
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center gap-2 py-14">
            <History size={32} color={colores.textoMuted} />
            <Text style={{ fontFamily: FUENTE.medium, fontSize: 14, color: colores.texto }}>
              No hay conversaciones
            </Text>
            <Text
              style={{
                fontFamily: FUENTE.regular,
                fontSize: 14,
                color: colores.textoSuave,
                textAlign: 'center',
              }}
            >
              Las consultas que realices con los chatbots aparecerán aquí.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => redirigir(item.chat_id, item.dataset_id)}
            className="mb-2.5 flex-row items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3.5"
          >
            <View className="size-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
              {item.dataset_id ? (
                <Database size={16} color={colores.textoMedio} />
              ) : (
                <MessageCircle size={16} color={colores.textoMedio} />
              )}
            </View>
            <View className="min-w-0 flex-1">
              <Text
                numberOfLines={1}
                style={{ fontFamily: FUENTE.medium, fontSize: 14, color: colores.texto }}
              >
                {item.titulo?.trim() ? item.titulo : 'Sin título'}
              </Text>
              <Text style={{ fontFamily: FUENTE.regular, fontSize: 12, color: colores.textoSuave }}>
                Fecha creación: {item.fecha_creacion}
              </Text>
            </View>
            <View className="rounded-full border border-slate-200 dark:border-slate-800 px-2 py-0.5">
              <Text style={{ fontFamily: FUENTE.regular, fontSize: 11, color: colores.textoMedio }}>
                {item.dataset_id ? 'Dataset' : 'General'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => pedirEliminar(item)}
              accessibilityLabel={`Eliminar chat ${item.titulo ?? ''}`}
              className="p-1.5"
            >
              <Trash2 size={16} color={colores.textoSuave} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <Modal
        visible={confirmacion !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmacion(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/50 px-6">
          <View className="w-full rounded-2xl bg-white dark:bg-slate-900 p-5">
            <Text
              style={{
                fontFamily: FUENTE.semibold,
                fontSize: 17,
                color: colores.texto,
                marginBottom: 8,
              }}
            >
              {confirmacion?.titulo}
            </Text>
            <Text className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {confirmacion?.descripcion}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const accion = confirmacion?.onConfirmar;
                setConfirmacion(null);
                accion?.();
              }}
              className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 dark:bg-red-500 px-4 py-3.5"
            >
              <Trash2 size={16} color="#fff" />
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                Eliminar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setConfirmacion(null)}
              className="mt-2 items-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5"
            >
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
                Cancelar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}
