import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { me } from '@/lib/auth';
import { Cargando } from '@/components/ui';

export default function Index() {
  const [destino, setDestino] = useState<'login' | 'datasets' | null>(null);

  useEffect(() => {
    me().then((user) => setDestino(user ? 'datasets' : 'login'));
  }, []);

  if (!destino) return <Cargando texto="Abriendo PLASMA…" />;
  return <Redirect href={destino === 'datasets' ? '/datasets' : '/login'} />;
}
