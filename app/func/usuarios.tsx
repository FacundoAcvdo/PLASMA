import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useFocusEffect } from 'expo-router';
import { Check, KeyRound, ShieldAlert, Trash2, UserPlus } from 'lucide-react-native';
import { ApiError, apiFetch } from '@/lib/api-fetch';
import { me } from '@/lib/auth';
import { CajaError, Campo, Cargando, FUENTE, Screen, Subtitulo, Titulo } from '@/components/ui';
import { Selector } from '@/components/Selector';
import { useTema } from '@/context/tema-context';

// Espejo de TF-U-FRONTEND/components/views/users-view.tsx.
// La fila de usuario se parte en dos líneas (datos + acciones) para entrar
// en pantalla, y los diálogos web son modales centrados.

type UsuarioReal = {
  id: string;
  email: string;
  role: string;
  created_at: string;
  last_sign_in_at: string;
};

type Rol = 'user' | 'admin';

const ROLES = [
  { valor: 'user', etiqueta: 'Usuario' },
  { valor: 'admin', etiqueta: 'Administrador' },
];

function etiquetaRol(role: string): string {
  return role === 'admin' ? 'Administrador' : 'Usuario';
}

function fechaAlta(createdAt: string): string {
  if (!createdAt || createdAt === 'None') return '—';
  return new Date(createdAt).toLocaleDateString();
}

function Etiqueta({ children }: { children: string }) {
  const { colores } = useTema();
  return (
    <Text
      style={{ fontFamily: FUENTE.medium, fontSize: 14, color: colores.texto, marginBottom: 6 }}
    >
      {children}
    </Text>
  );
}

export default function GestionUsuarios() {
  const { colores } = useTema();
  const [estado, setEstado] = useState<'cargando' | 'ok' | 'denegado'>('cargando');
  const [verificando, setVerificando] = useState(true);
  const [usuarios, setUsuarios] = useState<UsuarioReal[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<Rol>('user');
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);
  const [porEliminar, setPorEliminar] = useState<UsuarioReal | null>(null);
  const [porClave, setPorClave] = useState<UsuarioReal | null>(null);
  const [nuevaClave, setNuevaClave] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargar = useCallback(async () => {
    try {
      const data = await apiFetch<{ users?: UsuarioReal[] }>(
        '/auth/admin/users',
        { method: 'GET' },
        { silent: true },
      );
      setUsuarios(Array.isArray(data.users) ? data.users : []);
      setEstado('ok');
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        setEstado('denegado');
        return;
      }
      setErrorMensaje(
        e instanceof Error ? e.message : 'No se pudo conectar con el servidor.',
      );
      setEstado('ok');
    }
  }, []);

  // La app no desmonta esta pantalla al cerrar sesión (el login es otra
  // pantalla del mismo drawer). Se revalida el rol en cada foco para no
  // dejar datos del administrador visibles para otra cuenta.
  useFocusEffect(
    useCallback(() => {
      let activo = true;
      setVerificando(true);
      (async () => {
        const user = await me();
        if (!activo) return;
        if (user?.role !== 'admin') {
          setUsuarios([]);
          setEstado('denegado');
          setVerificando(false);
          return;
        }
        await cargar();
        if (activo) setVerificando(false);
      })();
      return () => {
        activo = false;
      };
    }, [cargar]),
  );

  async function crear() {
    if (!email.trim() || !password || procesando) return;
    if (password.length < 6) {
      setErrorMensaje('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setProcesando(true);
    setMensaje(null);
    setErrorMensaje(null);
    try {
      await apiFetch('/auth/admin/users', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password, role: rol }),
      });
      setMensaje('Usuario creado correctamente');
      setEmail('');
      setPassword('');
      setRol('user');
      await cargar();
    } catch (e) {
      setErrorMensaje(
        e instanceof Error ? e.message : 'No se pudo conectar con el servidor.',
      );
    } finally {
      setProcesando(false);
    }
  }

  async function cambiarRol(u: UsuarioReal, nuevoRol: string) {
    if (nuevoRol === u.role) return;
    setErrorMensaje(null);
    try {
      await apiFetch(`/auth/admin/users/${u.id}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nuevoRol }),
      });
      await cargar();
    } catch (e) {
      setErrorMensaje(
        e instanceof Error ? e.message : 'No se pudo conectar con el servidor.',
      );
    }
  }

  async function cambiarClave() {
    if (!porClave || nuevaClave.length < 6) {
      setErrorMensaje('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    setErrorMensaje(null);
    setMensaje(null);
    try {
      await apiFetch(`/auth/admin/users/${porClave.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: nuevaClave }),
      });
      setMensaje(`Contraseña de ${porClave.email} actualizada.`);
      setPorClave(null);
      setNuevaClave('');
    } catch (e) {
      setErrorMensaje(
        e instanceof Error ? e.message : 'No se pudo conectar con el servidor.',
      );
    }
  }

  async function eliminar(id: string) {
    setErrorMensaje(null);
    try {
      await apiFetch(`/auth/admin/users/${id}`, { method: 'DELETE' });
      await cargar();
    } catch (e) {
      setErrorMensaje(
        e instanceof Error ? e.message : 'No se pudo conectar con el servidor.',
      );
    } finally {
      setPorEliminar(null);
    }
  }

  if (verificando || estado === 'cargando') {
    return <Cargando texto="Verificando acceso…" />;
  }

  if (estado === 'denegado') {
    return (
      <Screen>
        <Titulo>Gestión de usuarios</Titulo>
        <Subtitulo>Crea y elimina cuentas con acceso a la plataforma.</Subtitulo>
        <View className="flex-row items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <ShieldAlert size={16} color={colores.textoSuave} />
          <Text className="flex-1 text-sm text-slate-500 dark:text-slate-400">
            Solo un superadministrador puede ver esta sección.
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAwareScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        bottomOffset={20}
      >
        <Titulo>Gestión de usuarios</Titulo>
        <Subtitulo>Crea y elimina cuentas con acceso a la plataforma.</Subtitulo>

        <CajaError mensaje={errorMensaje} />

        <View className="gap-4">
          <View className="gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
            <View className="gap-1">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
                Crear usuario
              </Text>
              <Text className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Alta de una nueva cuenta con acceso a la plataforma.
              </Text>
            </View>

            <View>
              <Etiqueta>Correo electrónico</Etiqueta>
              <Campo
                value={email}
                onChangeText={setEmail}
                placeholder="nombre@instituto.org"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View>
              <Etiqueta>Contraseña</Etiqueta>
              <Campo
                value={password}
                onChangeText={setPassword}
                placeholder="Mínimo 6 caracteres"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <Selector
              etiqueta="Rol"
              valor={rol}
              opciones={ROLES}
              onCambiar={(v) => setRol(v as Rol)}
            />

            <TouchableOpacity
              onPress={() => void crear()}
              disabled={procesando}
              className={`flex-row items-center justify-center gap-2 rounded-xl px-4 py-3.5 ${
                procesando ? 'bg-primario-300 dark:bg-primario-900' : 'bg-primario dark:bg-primario-500'
              }`}
            >
              {procesando ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <UserPlus size={18} color="#fff" />
              )}
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                Crear usuario
              </Text>
            </TouchableOpacity>

            {mensaje && (
              <View className="flex-row items-center gap-1.5">
                <Check size={16} color={colores.exito} />
                <Text
                  style={{ fontFamily: FUENTE.regular, fontSize: 14, color: colores.exito }}
                >
                  {mensaje}
                </Text>
              </View>
            )}
          </View>

          <View className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <View className="border-b border-slate-100 dark:border-slate-800 px-4 py-4">
              <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
                Usuarios ({usuarios.length})
              </Text>
            </View>
            <View className="gap-2.5 p-4">
              {usuarios.map((u) => (
                <View
                  key={u.id}
                  className="gap-3 rounded-lg border border-slate-200 dark:border-slate-800 p-3"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="size-9 shrink-0 items-center justify-center rounded-full bg-primario-50 dark:bg-primario-950">
                      <Text
                        style={{
                          fontFamily: FUENTE.semibold,
                          fontSize: 12,
                          color: colores.primario,
                        }}
                      >
                        {u.email.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                    <View className="min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        style={{
                          fontFamily: FUENTE.medium,
                          fontSize: 14,
                          color: colores.texto,
                        }}
                      >
                        {u.email}
                      </Text>
                      <Text numberOfLines={1} className="text-xs text-slate-500 dark:text-slate-400">
                        Alta: {fechaAlta(u.created_at)}
                      </Text>
                    </View>
                    <View
                      className={`rounded-full px-2.5 py-0.5 ${
                        u.role === 'admin' ? 'bg-primario dark:bg-primario-500' : 'bg-slate-100 dark:bg-slate-800'
                      }`}
                    >
                      <Text
                        style={{
                          fontFamily: FUENTE.regular,
                          fontSize: 11,
                          color: u.role === 'admin' ? '#fff' : colores.textoMedio,
                        }}
                      >
                        {etiquetaRol(u.role)}
                      </Text>
                    </View>
                  </View>

                  <View className="flex-row items-end gap-2">
                    <View className="flex-1">
                      <Selector
                        etiqueta="Rol"
                        valor={u.role}
                        opciones={ROLES}
                        onCambiar={(v) => void cambiarRol(u, v)}
                      />
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        setPorClave(u);
                        setNuevaClave('');
                        setErrorMensaje(null);
                      }}
                      accessibilityLabel={`Cambiar contraseña de ${u.email}`}
                      className="size-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <KeyRound size={16} color={colores.textoSuave} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setPorEliminar(u)}
                      accessibilityLabel={`Eliminar a ${u.email}`}
                      className="size-11 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800"
                    >
                      <Trash2 size={16} color={colores.textoSuave} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
              {usuarios.length === 0 && (
                <Text className="text-sm text-slate-500 dark:text-slate-400">No hay usuarios para mostrar.</Text>
              )}
            </View>
          </View>
        </View>
      </KeyboardAwareScrollView>

      {porClave && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPorClave(null)}
        >
          <View className="flex-1 bg-black/50">
            <KeyboardAwareScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'center',
                paddingHorizontal: 24,
              }}
              keyboardShouldPersistTaps="handled"
              bottomOffset={24}
            >
              <View className="w-full rounded-2xl bg-white dark:bg-slate-900 p-5">
                <Text
                  style={{
                    fontFamily: FUENTE.semibold,
                    fontSize: 17,
                    color: colores.texto,
                    marginBottom: 6,
                  }}
                >
                  Cambiar contraseña
                </Text>
                <Text className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  Nueva contraseña para {porClave.email}. Se cerrarán sus sesiones.
                </Text>

                <CajaError mensaje={errorMensaje} />

                <Campo
                  value={nuevaClave}
                  onChangeText={setNuevaClave}
                  placeholder="Mínimo 6 caracteres"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => void cambiarClave()}
                  className="flex-row items-center justify-center gap-2 rounded-xl bg-primario dark:bg-primario-500 px-4 py-3.5"
                >
                  <KeyRound size={16} color="#fff" />
                  <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                    Guardar
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setPorClave(null)}
                  className="mt-2 items-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5"
                >
                  <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
                    Cancelar
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAwareScrollView>
          </View>
        </Modal>
      )}

      {porEliminar && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPorEliminar(null)}
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
                Eliminar usuario
              </Text>
              <Text className="mb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                ¿Seguro que quieres eliminar a {porEliminar.email}? Esta acción no se puede
                deshacer.
              </Text>
              <TouchableOpacity
                onPress={() => void eliminar(porEliminar.id)}
                className="flex-row items-center justify-center gap-2 rounded-xl bg-red-600 dark:bg-red-500 px-4 py-3.5"
              >
                <Trash2 size={16} color="#fff" />
                <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: '#fff' }}>
                  Eliminar
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPorEliminar(null)}
                className="mt-2 items-center rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3.5"
              >
                <Text style={{ fontFamily: FUENTE.semibold, fontSize: 16, color: colores.texto }}>
                  Cancelar
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Screen>
  );
}
