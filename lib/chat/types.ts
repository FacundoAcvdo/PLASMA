// Origen: TF-U-FRONTEND/components/views/chatbot-view.tsx — mantener sincronizado.
export type AutorMensaje = 'usuario' | 'asistente';

export type Mensaje = {
  autor: AutorMensaje;
  mensaje: string;
  created_at: string;
};

export type ChatActivo = {
  chat_id: string;
  titulo?: string | null;
  mensajes: Mensaje[];
};

export type RespuestaEnvio = {
  respuesta: Mensaje;
  pregunta: { created_at: string };
  titulo?: string | null;
};

// Origen: TF-U-FRONTEND/components/views/chat-history-view.tsx — mantener sincronizado.
export type ChatResumen = {
  titulo: string | null;
  chat_id: string;
  fecha_creacion: string;
  updated_at: string;
  activo: boolean;
  dataset_id: string | null;
};

export type HistorialChats = {
  total: number;
  chats: ChatResumen[];
};

export function formatearFechaHora(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
