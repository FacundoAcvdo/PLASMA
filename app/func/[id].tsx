import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { TITULOS_FUNC } from '@/components/MenuLateral';
import { Boton, Screen, Subtitulo, Titulo } from '@/components/ui';

// Pantalla genérica para funcionalidades aún no porteadas.
export default function Funcionalidad() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const titulo = (id && TITULOS_FUNC[id]) || 'Sección';

  return (
    <Screen>
      <Titulo>{titulo}</Titulo>
      <Subtitulo>Esta sección todavía no está disponible en la app móvil.</Subtitulo>
      <View className="items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10">
        <Text className="text-center text-sm text-slate-500">
          Próximamente: misma funcionalidad que en la plataforma web.
        </Text>
      </View>
      <Boton titulo="Volver a datasets" onPress={() => router.replace('/datasets')} />
    </Screen>
  );
}
