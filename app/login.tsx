import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Lock, Mail } from 'lucide-react-native';
import { login } from '@/lib/auth';
import { ApiError } from '@/lib/api-fetch';
import { Boton, CajaError, CampoConIcono, Screen, Subtitulo, Titulo } from '@/components/ui';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    <Screen>
      <Titulo>Iniciar sesión</Titulo>
      <Subtitulo>Accede con tu cuenta institucional.</Subtitulo>
      <CajaError mensaje={error} />
      <CampoConIcono
        icono={<Mail size={16} color="#94a3b8" />}
        placeholder="nombre@instituto.org"
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <CampoConIcono
        icono={<Lock size={16} color="#94a3b8" />}
        placeholder="Contraseña"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Boton titulo={cargando ? 'Verificando…' : 'Entrar'} onPress={entrar} deshabilitado={cargando} />
    </Screen>
  );
}
