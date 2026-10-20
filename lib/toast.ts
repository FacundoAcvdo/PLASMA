// Registro de toasts: el <Toaster/> montado atiende estos avisos.
// (En web esto lo hace sonner; acá un Toaster propio sin dependencias.)
export type ToastKind = 'success' | 'error' | 'info';

type Listener = (kind: ToastKind, message: string) => void;

let listener: Listener | null = null;

export function registerToastListener(fn: Listener | null) {
  listener = fn;
}

function emit(kind: ToastKind, message: string) {
  listener?.(kind, message);
}

export const toast = {
  success(message: string) {
    emit('success', message);
  },
  error(message: string) {
    emit('error', message);
  },
  info(message: string) {
    emit('info', message);
  },
};
