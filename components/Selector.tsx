import { useState } from 'react';
import { FlatList, Modal, Pressable, Text, View } from 'react-native';

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
  const actual = opciones.find((o) => o.valor === valor);

  return (
    <View>
      <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0f172a', marginBottom: 6 }}>
        {etiqueta}
      </Text>
      <Pressable
        disabled={deshabilitado}
        onPress={() => setAbierto(true)}
        className={`rounded-lg border border-slate-200 bg-white px-4 py-3 ${deshabilitado ? 'opacity-50' : ''}`}
      >
        <Text className={`text-sm ${actual ? 'text-slate-900' : 'text-slate-400'}`}>
          {actual ? actual.etiqueta : (placeholder ?? 'Seleccionar')}
        </Text>
      </Pressable>
      <Modal visible={abierto} transparent animationType="slide" onRequestClose={() => setAbierto(false)}>
        <Pressable className="flex-1 justify-end bg-black/40" onPress={() => setAbierto(false)}>
          <Pressable className="max-h-[70%] rounded-t-3xl bg-white px-5 pb-8 pt-4">
            <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 16, color: '#0f172a', marginBottom: 12 }}>
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
                  className={`rounded-lg px-3 py-3 ${item.valor === valor ? 'bg-indigo-50' : ''}`}
                >
                  <Text
                    style={{ fontFamily: item.valor === valor ? 'Inter_600SemiBold' : 'Inter_400Regular' }}
                    className={`text-sm ${item.valor === valor ? 'text-indigo-700' : 'text-slate-900'}`}
                  >
                    {item.etiqueta}
                  </Text>
                  {item.detalle ? (
                    <Text className="text-xs text-slate-500">{item.detalle}</Text>
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
