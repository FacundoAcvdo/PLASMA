import { useEffect, useState } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import {
  BarChart3,
  Blocks,
  Bot,
  Bubbles,
  Cloud,
  Database,
  FileText,
  Gauge,
  Layers,
  LogOut,
  MessagesSquare,
  Network,
  Settings2,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { logout, me } from '@/lib/auth';

type Item = { id: string; titulo: string; icono: LucideIcon; href: string };
type Grupo = { titulo: string; items: Item[] };

// Espejo del menú web (devop). Las rutas sin pantalla van a /func/<id>.
const GRUPOS: Grupo[] = [
  {
    titulo: 'Dataset',
    items: [
      { id: 'cargar', titulo: 'Cargar dataset', icono: Upload, href: '/upload' },
      { id: 'datasets', titulo: 'Mis datasets', icono: Database, href: '/datasets' },
      { id: 'estadisticas', titulo: 'Estadísticas', icono: BarChart3, href: '/func/estadisticas' },
      { id: 'limpieza', titulo: 'Limpieza de datos', icono: Settings2, href: '/func/limpieza' },
    ],
  },
  {
    titulo: 'Análisis de texto',
    items: [
      { id: 'embeddings', titulo: 'Embeddings', icono: Sparkles, href: '/func/embeddings' },
      { id: 'nube', titulo: 'Nube de palabras', icono: Cloud, href: '/func/nube' },
      { id: 'emociones', titulo: 'Detección de emociones', icono: Bubbles, href: '/func/emociones' },
      { id: 'topicos', titulo: 'Tópicos principales', icono: Layers, href: '/func/topicos' },
      { id: 'evolucion', titulo: 'Evolución de palabras', icono: Network, href: '/func/evolucion' },
      { id: 'sentimientos', titulo: 'Evolución de emociones', icono: MessagesSquare, href: '/func/sentimientos' },
    ],
  },
  {
    titulo: 'Riesgo',
    items: [
      { id: 'mencion', titulo: 'Construir clasificador', icono: Blocks, href: '/func/mencion' },
      { id: 'riesgo', titulo: 'Nivel de riesgo', icono: Gauge, href: '/func/riesgo' },
    ],
  },
  {
    titulo: 'Asistentes',
    items: [
      { id: 'chatbot', titulo: 'Chatbot general', icono: Bot, href: '/func/chatbot' },
      { id: 'chatbot-dataset', titulo: 'Chatbot dataset', icono: FileText, href: '/func/chatbot-dataset' },
      { id: 'historial', titulo: 'Historial de chats', icono: MessagesSquare, href: '/func/historial' },
    ],
  },
  {
    titulo: 'Administración',
    items: [
      { id: 'informes', titulo: 'Informes', icono: FileText, href: '/func/informes' },
      { id: 'usuarios', titulo: 'Usuarios', icono: Users, href: '/func/usuarios' },
      { id: 'almacenamiento', titulo: 'Almacenamiento', icono: Database, href: '/func/almacenamiento' },
    ],
  },
];

export const TITULOS_FUNC: Record<string, string> = Object.fromEntries(
  GRUPOS.flatMap((g) => g.items.map((i) => [i.id, i.titulo])),
);

export function MenuLateral({ navigation }: { navigation: { closeDrawer: () => void } }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState<string | null>(null);
  const [rol, setRol] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;
    me().then((user) => {
      if (!activo) return;
      setEmail(user?.email ?? null);
      setRol(user?.role ?? null);
    });
    return () => {
      activo = false;
    };
  }, [pathname]);

  const ir = (href: string) => {
    navigation.closeDrawer();
    router.push(href as never);
  };

  const cerrarSesion = async () => {
    navigation.closeDrawer();
    await logout();
    queryClient.clear();
    router.replace('/login');
  };

  const correo = email ?? 'usuario@demo.local';

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
      <View className="flex-1">
        <View className="flex-row items-center gap-2.5 px-5 py-4">
          <Image
            source={require('@/assets/logo.png')}
            style={{ width: 36, height: 36 }}
            resizeMode="contain"
          />
          <View className="min-w-0">
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0f172a' }}>
              PLASMA
            </Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>Salud mental</Text>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {GRUPOS.map((grupo) => {
            const items = grupo.items.filter(
              (item) => item.id !== 'usuarios' || rol === 'admin',
            );
            if (items.length === 0) return null;
            return (
              <View key={grupo.titulo} className="mb-4">
                <Text className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {grupo.titulo}
                </Text>
                {items.map((item) => {
                  const Icono = item.icono;
                  const activo = pathname === item.href;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => ir(item.href)}
                      className={`mb-0.5 flex-row items-center gap-3 rounded-lg px-3 py-2.5 ${
                        activo ? 'bg-indigo-600' : ''
                      }`}
                    >
                      <Icono size={17} color={activo ? '#fff' : '#64748b'} />
                      <Text
                        style={{ fontFamily: 'Inter_500Medium' }}
                        className={`text-sm ${activo ? 'text-white' : 'text-slate-700'}`}
                      >
                        {item.titulo}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        <View className="border-t border-slate-100 px-3 pb-2 pt-3">
          <View className="flex-row items-center gap-2.5 rounded-lg px-2.5 py-2">
            <View className="size-8 shrink-0 items-center justify-center rounded-full bg-slate-100">
              <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#475569' }}>
                {correo.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text className="min-w-0 flex-1 text-xs text-slate-500" numberOfLines={1}>
              {correo}
            </Text>
          </View>
          <TouchableOpacity
            onPress={cerrarSesion}
            className="mt-1 flex-row items-center gap-2.5 rounded-lg px-2.5 py-2"
          >
            <LogOut size={16} color="#64748b" />
            <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-sm text-slate-700">
              Cerrar sesión
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
