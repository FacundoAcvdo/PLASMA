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
import { DatasetProvider } from '@/context/dataset-context';
import { JobsProvider } from '@/context/jobs-context';
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <JobsProvider>
            <DatasetProvider>
              <StatusBar style="dark" />
              <Drawer
                drawerContent={({ navigation }) => <MenuLateral navigation={navigation} />}
                screenOptions={{
                  headerTintColor: '#0f172a',
                  headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
                  headerTitle: '',
                  headerRight: () => <LogoHeader />,
                  drawerStyle: { width: 300 },
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
                <Drawer.Screen name="func/[id]" options={{ title: 'Sección' }} />
              </Drawer>
              <Toaster />
            </DatasetProvider>
          </JobsProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
