import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAwareScrollView,
  type KeyboardAwareScrollViewRef,
} from 'react-native-keyboard-controller';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api-fetch';
import { FUENTE } from '@/components/ui';

// Espejo de TF-U-FRONTEND/app/(auth)/login/page.tsx:
// panel de marca (izquierda en web, arriba en móvil) + panel de acceso.
export default function Login() {
  const router = useRouter();
  const scrollRef = useRef<KeyboardAwareScrollViewRef>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function mostrarAcceso() {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 350);
  }

  async function entrar() {
    if (!email.trim() || !password || cargando) return;
    setCargando(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/datasets');
    } catch (e) {
      // apiFetch ya mostró el toast; acá queda el detalle local
      setError(e instanceof ApiError ? e.message : 'No se pudo iniciar sesión.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <KeyboardAwareScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bottomOffset={24}
      >
        <View className="flex-1">
            {/* Panel de marca */}
            <View className="flex-1 justify-between gap-8 bg-slate-100 px-7 py-10">
              <View className="flex-row items-center gap-2.5">
                <Image
                  source={require('@/assets/logo.png')}
                  style={{ width: 36, height: 36 }}
                  resizeMode="contain"
                />
                <Text style={{ fontFamily: FUENTE.semibold }} className="text-lg text-slate-900">
                  PLASMA
                </Text>
              </View>

              <View className="gap-3">
                <Text
                  style={{ fontFamily: FUENTE.semibold }}
                  className="text-3xl leading-tight text-slate-900"
                >
                  Plataforma de Lenguaje y Análisis de Salud Mental Automatizado
                </Text>
                <Text
                  style={{ fontFamily: FUENTE.regular }}
                  className="text-md leading-relaxed text-slate-600"
                >
                  Herramienta de investigación para explorar patrones lingüísticos, emociones y
                  niveles de riesgo en corpus textuales. Está pensada para el ámbito de la salud
                  mental —con foco en la prevención— y también para el análisis general de lenguaje.
                </Text>
              </View>
            </View>

            {/* Panel de acceso */}
            <View className="gap-6 bg-white px-7 pb-10 pt-8">
              <View className="gap-1.5">
                <Text style={{ fontFamily: FUENTE.semibold }} className="text-xl text-slate-900">
                  Iniciar sesión
                </Text>
                <Text style={{ fontFamily: FUENTE.regular }} className="text-sm text-slate-500">
                  Accede con tu cuenta institucional.
                </Text>
              </View>

              {error ? (
                <View className="rounded-lg border border-red-200 bg-red-50 p-3">
                  <Text style={{ fontFamily: FUENTE.regular }} className="text-sm text-red-600">
                    {error}
                  </Text>
                </View>
              ) : null}

              <View className="gap-4">
                <View className="gap-1.5">
                  <Text style={{ fontFamily: FUENTE.medium }} className="text-sm text-slate-900">
                    Correo electrónico
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-3 z-10">
                      <Mail size={16} color="#64748b" />
                    </View>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="nombre@instituto.org"
                      placeholderTextColor="#94a3b8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      onFocus={mostrarAcceso}
                      style={{ fontFamily: FUENTE.regular }}
                      className="h-11 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900"
                    />
                  </View>
                </View>

                <View className="gap-1.5">
                  <Text style={{ fontFamily: FUENTE.medium }} className="text-sm text-slate-900">
                    Contraseña
                  </Text>
                  <View className="relative justify-center">
                    <View className="absolute left-3 z-10">
                      <Lock size={16} color="#64748b" />
                    </View>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94a3b8"
                      secureTextEntry
                      style={{ fontFamily: FUENTE.regular }}
                      className="h-11 rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900"
                      onFocus={mostrarAcceso}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                onPress={entrar}
                disabled={cargando}
                className={`h-12 flex-row items-center justify-center gap-2 rounded-lg ${
                  cargando ? 'bg-indigo-400' : 'bg-indigo-600'
                }`}
              >
                {cargando ? <ActivityIndicator color="#fff" size="small" /> : null}
                <Text style={{ fontFamily: FUENTE.medium }} className="text-base text-white">
                  {cargando ? 'Verificando…' : 'Entrar'}
                </Text>
              </TouchableOpacity>
            </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
