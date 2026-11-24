import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import * as SecureStore from 'expo-secure-store';
import { colorScheme, useColorScheme } from 'nativewind';
import { PALETA, type Colores } from '@/lib/tema';

export type PreferenciaTema = 'light' | 'dark' | 'system';

const CLAVE = 'tema_preferencia';

type ValorTema = {
  preferencia: PreferenciaTema;
  esquema: 'light' | 'dark';
  oscuro: boolean;
  colores: Colores;
  cambiar: (preferencia: PreferenciaTema) => void;
  alternar: () => void;
};

const ContextoTema = createContext<ValorTema | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const { colorScheme: esquema } = useColorScheme();
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('system');

  useEffect(() => {
    let activo = true;
    SecureStore.getItemAsync(CLAVE)
      .then((guardado) => {
        if (!activo) return;
        if (guardado === 'light' || guardado === 'dark' || guardado === 'system') {
          setPreferencia(guardado);
          colorScheme.set(guardado);
        }
      })
      .catch(() => {});
    return () => {
      activo = false;
    };
  }, []);

  const valor = useMemo<ValorTema>(() => {
    const oscuro = esquema === 'dark';
    return {
      preferencia,
      esquema: oscuro ? 'dark' : 'light',
      oscuro,
      colores: oscuro ? PALETA.oscuro : PALETA.claro,
      cambiar: (nueva) => {
        setPreferencia(nueva);
        colorScheme.set(nueva);
        SecureStore.setItemAsync(CLAVE, nueva).catch(() => {});
      },
      alternar: () => {
        const nueva: PreferenciaTema = oscuro ? 'light' : 'dark';
        setPreferencia(nueva);
        colorScheme.set(nueva);
        SecureStore.setItemAsync(CLAVE, nueva).catch(() => {});
      },
    };
  }, [esquema, preferencia]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const contexto = useContext(ContextoTema);
  if (!contexto) throw new Error('useTema debe usarse dentro de TemaProvider');
  return contexto;
}
