import { useEffect, useState } from 'react';
import { Animated, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerToastListener, type ToastKind } from '@/lib/toast';

/**
 * Toaster propio (sin dependencias): avisos arriba y centrados,
 * verde éxito / rojo error. Desliza desde arriba con fade.
 * Mismo contrato que web: solo éxitos de background tasks + errores.
 */
export function Toaster() {
  const insets = useSafeAreaInsets();
  const [aviso, setAviso] = useState<{ kind: ToastKind; message: string; id: number } | null>(null);
  const [anim] = useState(() => ({
    opacidad: new Animated.Value(0),
    desplazamiento: new Animated.Value(-16),
  }));
  const [timer, setTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    registerToastListener((kind, message) => {
      if (timer) clearTimeout(timer);
      setAviso({ kind, message, id: Date.now() });
      anim.desplazamiento.setValue(-16);
      Animated.parallel([
        Animated.timing(anim.opacidad, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(anim.desplazamiento, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(anim.opacidad, { toValue: 0, duration: 250, useNativeDriver: true }),
          Animated.timing(anim.desplazamiento, { toValue: -16, duration: 250, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) setAviso(null);
        });
      }, 3500);
      setTimer(t);
    });
    return () => {
      registerToastListener(null);
      if (timer) clearTimeout(timer);
    };
  }, [anim, timer]);

  if (!aviso) return null;
  const fondo =
    aviso.kind === 'success' ? 'bg-emerald-600' : aviso.kind === 'info' ? 'bg-indigo-600' : 'bg-red-600';

  return (
    <View
      className="absolute left-5 right-5 items-center"
      style={{ top: insets.top + 12 }}
      pointerEvents="none"
    >
      <Animated.View
        style={{
          opacity: anim.opacidad,
          transform: [{ translateY: anim.desplazamiento }],
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 6,
        }}
        className={`w-full rounded-xl px-4 py-3 ${fondo}`}
      >
        <Text className="text-center text-sm font-semibold text-white">{aviso.message}</Text>
      </Animated.View>
    </View>
  );
}
