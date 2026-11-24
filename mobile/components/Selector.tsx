import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';
import { useTema } from '@/context/tema-context';

export type OpcionSelector = { valor: string; etiqueta: string; detalle?: string };

/** Select estilo app: botón que abre modal con opciones. */
export function Selector({
  etiqueta,
  valor,
  placeholder,
  opciones,
  onCambiar,
  deshabilitado,
}: {
  etiqueta: string;
  valor: string;
  placeholder?: string;
  opciones: OpcionSelector[];
  onCambiar: (valor: string) => void;
  deshabilitado?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);
  const { colores } = useTema();
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: colores.texto, marginBottom: 6 }}>
        {etiqueta}
      </Text>
      <Pressable
        disabled={deshabilitado}
        onPress={() => setAbierto(true)}
        className={`rounded-lg border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 ${deshabilitado ? 'opacity-50' : ''}`}
      >
        <Text className={`text-sm ${actual ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}`}>
          {actual ? actual.etiqueta : (placeholder ?? 'Seleccionar')}
        </Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setAbierto(false)}>
          <Pressable className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-4 dark:bg-slate-900">
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: colores.texto, marginBottom: 12 }}>
              {etiqueta}
            </Text>
            <FlatList
              data={opciones}
              keyExtractor={(item) => item.valor || '__vacio__'}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onCambiar(item.valor);
                    setAbierto(false);
                  }}
                  className={`rounded-lg px-3 py-3 ${item.valor === valor ? 'bg-primario-50 dark:bg-primario-950' : ''}`}
                >
                  <Text
                    style={{ fontFamily: item.valor === valor ? 'Inter_600SemiBold' : 'Inter_400Regular' }}
                    className={`text-sm ${item.valor === valor ? 'text-primario-700 dark:text-primario-300' : 'text-slate-900 dark:text-slate-100'}`}
                  >
                    {item.etiqueta}
                  </Text>
                  {item.detalle ? (
                    <Text className="text-xs text-slate-500 dark:text-slate-400">{item.detalle}</Text>
                  ) : null}
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
