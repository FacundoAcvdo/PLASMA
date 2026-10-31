import '../global.css';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Drawer } from 'expo-router/drawer';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { DatasetProvider } from '@/context/dataset-context';
import { JobsProvider } from '@/context/jobs-context';
import { TemaProvider, useTema } from '@/context/tema-context';
import { MenuLateral } from '@/components/MenuLateral';
import { LogoHeader } from '@/components/ui';
import { Toaster } from '@/components/Toaster';
import { SplashScreen } from 'expo-router';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 1000 * 60 * 5 } },
      }),
  );
  const [fuentes] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fuentes) SplashScreen.hideAsync().catch(() => {});
  }, [fuentes]);

  if (!fuentes) return null;

  return (
    <SafeAreaProvider>
      <KeyboardProvider>
        <TemaProvider>
          <QueryClientProvider client={queryClient}>
            <JobsProvider>
              <DatasetProvider>
                <Navegacion />
              </DatasetProvider>
            </JobsProvider>
          </QueryClientProvider>
        </TemaProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
  );
}

function Navegacion() {
  const { oscuro, colores } = useTema();

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colores.fondo }}>
      <StatusBar style={oscuro ? 'light' : 'dark'} />
      <Drawer
        drawerContent={({ navigation }) => <MenuLateral navigation={navigation} />}
        screenOptions={{
          headerTintColor: colores.texto,
          headerStyle: { backgroundColor: colores.fondo },
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
          headerTitle: '',
          headerRight: () => <LogoHeader />,
          drawerStyle: { width: 300, backgroundColor: colores.fondo },
        }}
      >
                  <Drawer.Screen
                    name="index"
                    options={{ drawerItemStyle: { display: 'none' }, headerShown: false }}
                  />
                  <Drawer.Screen
                    name="login"
                    options={{ drawerItemStyle: { display: 'none' }, headerShown: false }}
                  />
                  <Drawer.Screen name="datasets" options={{ title: 'Datasets' }} />
                  <Drawer.Screen name="upload" options={{ title: 'Cargar dataset' }} />
                  <Drawer.Screen name="func/estadisticas" options={{ title: 'Estadísticas' }} />
                  <Drawer.Screen name="func/limpieza" options={{ title: 'Limpieza de datos' }} />
                  <Drawer.Screen name="func/embeddings" options={{ title: 'Embeddings' }} />
                  <Drawer.Screen name="func/nube" options={{ title: 'Nube de palabras' }} />
                  <Drawer.Screen name="func/emociones" options={{ title: 'Emociones' }} />
                  <Drawer.Screen name="func/topicos" options={{ title: 'Tópicos' }} />
                  <Drawer.Screen name="func/evolucion" options={{ title: 'Evolución de palabras' }} />
                  <Drawer.Screen name="func/sentimientos" options={{ title: 'Sentimientos en el tiempo' }} />
                  <Drawer.Screen name="func/mencion" options={{ title: 'Construir clasificador' }} />
                  <Drawer.Screen name="func/riesgo" options={{ title: 'Nivel de riesgo' }} />
                  <Drawer.Screen name="func/chatbot" options={{ title: 'Chatbot general' }} />
                  <Drawer.Screen name="func/chatbot-dataset" options={{ title: 'Chatbot dataset' }} />
                  <Drawer.Screen name="func/historial" options={{ title: 'Historial de chats' }} />
                  <Drawer.Screen name="func/informes" options={{ title: 'Generar informes' }} />
                  <Drawer.Screen name="func/usuarios" options={{ title: 'Gestión de usuarios' }} />
                  <Drawer.Screen
                    name="func/almacenamiento"
                    options={{ title: 'Almacenamiento' }}
                  />
                  <Drawer.Screen name="func/[id]" options={{ title: 'Sección' }} />
      </Drawer>
      <Toaster />
    </GestureHandlerRootView>
  );
}
