import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, usePathname } from 'expo-router';
import {
  Activity,
  BarChart3,
  Bot,
  Cloud,
  Database,
  FileText,
  Gauge,
  HeartCrack,
  Layers,
  MessagesSquare,
  Network,
  Settings2,
  ShieldAlert,
  Sparkles,
  Upload,
  Users,
  type LucideIcon,
} from 'lucide-react-native';

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
      { id: 'emociones', titulo: 'Emociones', icono: HeartCrack, href: '/func/emociones' },
      { id: 'topicos', titulo: 'Tópicos', icono: Layers, href: '/func/topicos' },
      { id: 'evolucion', titulo: 'Evolución de palabras', icono: Network, href: '/func/evolucion' },
      { id: 'sentimientos', titulo: 'Sentimientos en el tiempo', icono: MessagesSquare, href: '/func/sentimientos' },
    ],
  },
  {
    titulo: 'Riesgo',
    items: [
      { id: 'mencion', titulo: 'Mención suicidio', icono: ShieldAlert, href: '/func/mencion' },
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

  const ir = (href: string) => {
    navigation.closeDrawer();
    router.push(href as never);
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-white">
    <View className="flex-1 px-4 py-4">
      <View className="mb-5 flex-row items-center gap-2.5 px-1">
        <View className="size-9 items-center justify-center rounded-lg bg-indigo-600">
          <Activity size={18} color="#fff" />
        </View>
        <View>
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 14, color: '#0f172a' }}>
            TFU
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>Análisis de datos</Text>
        </View>
      </View>
      {GRUPOS.map((grupo) => (
        <View key={grupo.titulo} className="mb-4">
          <Text className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {grupo.titulo}
          </Text>
          {grupo.items.map((item) => {
            const Icono = item.icono;
            const activo =
              pathname === item.href || (item.href.startsWith('/func/') && pathname === item.href);
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
      ))}
    </View>
    </SafeAreaView>
  );
}
