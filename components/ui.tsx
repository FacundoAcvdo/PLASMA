import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTema } from '@/context/tema-context';

export const FUENTE = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

function TextoBase({ style, ...props }: TextProps) {
  return <Text style={[{ fontFamily: FUENTE.regular }, style]} {...props} />;
}

export function Screen({ children }: { children: ReactNode }) {
  return (
    <SafeAreaView
      edges={['top', 'bottom', 'left', 'right']}
      className="flex-1 bg-white dark:bg-slate-950"
    >
      <View className="flex-1 px-5 py-4">{children}</View>
    </SafeAreaView>
  );
}

export function LogoHeader() {
  const { colores } = useTema();
  return (
    <View className="mr-4 flex-row items-center gap-2">
      <TextoBase style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
        PLASMA
      </TextoBase>
      <Image
        source={require('@/assets/logo.png')}
        style={{ width: 32, height: 32 }}
        resizeMode="contain"
      />
    </View>
  );
}

export function Titulo({ children }: { children: ReactNode }) {
  const { colores } = useTema();
  return (
    <Text style={{ fontFamily: FUENTE.semibold, fontSize: 24, color: colores.texto }}>
      {children}
    </Text>
  );
}

export function Subtitulo({ children }: { children: ReactNode }) {
  const { colores } = useTema();
  return (
    <Text
      style={{ fontFamily: FUENTE.regular, fontSize: 14, color: colores.textoSuave, marginBottom: 20 }}
    >
      {children}
    </Text>
  );
}

export function Boton({
  titulo,
  onPress,
  deshabilitado,
}: {
  titulo: string;
  onPress: () => void;
  deshabilitado?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={deshabilitado}
      className={`mt-2 items-center rounded-xl px-4 py-3.5 ${
        deshabilitado ? 'bg-primario-300 dark:bg-primario-900' : 'bg-primario dark:bg-primario-500'
      }`}
    >
      <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>{titulo}</Text>
    </TouchableOpacity>
  );
}

export function Campo(props: TextInputProps) {
  const { colores } = useTema();
  return (
    <TextInput
      {...props}
      placeholderTextColor={colores.textoMuted}
      style={{ fontFamily: FUENTE.regular, fontSize: 14, color: colores.texto }}
      className="mb-3 h-12 rounded-lg border border-slate-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900"
    />
  );
}

export function CampoConIcono({
  icono,
  ...props
}: TextInputProps & { icono: ReactNode }) {
  const { colores } = useTema();
  return (
    <View className="relative mb-3 justify-center">
      <View className="absolute left-3 z-10">{icono}</View>
      <TextInput
        {...props}
        placeholderTextColor={colores.textoMuted}
        style={{ fontFamily: FUENTE.regular, fontSize: 14, color: colores.texto }}
        className="h-12 rounded-lg border border-slate-200 bg-white pl-10 pr-3 dark:border-slate-800 dark:bg-slate-900"
      />
    </View>
  );
}

export function CajaError({ mensaje }: { mensaje: string | null }) {
  const { colores } = useTema();
  if (!mensaje) return null;
  return (
    <View className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-950">
      <TextoBase style={{ fontSize: 14, color: colores.error }}>{mensaje}</TextoBase>
    </View>
  );
}

export function CajaExito({ children }: { children: ReactNode }) {
  return (
    <View className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-900 dark:bg-emerald-950">
      {children}
    </View>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  const { colores } = useTema();
  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-slate-950">
      <ActivityIndicator size="large" color={colores.primario} />
      <TextoBase style={{ marginTop: 12, fontSize: 14, color: colores.textoSuave }}>{texto}</TextoBase>
    </View>
  );
}
