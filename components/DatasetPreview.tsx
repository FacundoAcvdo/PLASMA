import { ScrollView, Text, View } from 'react-native';
import type { DatasetPreviewData } from '@/lib/dataset/types';

const ANCHO_COLUMNA = 160;
const ALTO_MAXIMO_TABLA = 320;

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const texto = String(value).trim();
  return texto === '' ? null : texto;
}

export function DatasetPreview({ preview }: { preview: DatasetPreviewData }) {
  if (preview.columns.length === 0) {
    return (
      <View className="rounded-xl border border-slate-200 bg-white p-4">
        <Text className="text-sm text-slate-500">El archivo no contiene datos.</Text>
      </View>
    );
  }

  const ultimoIndice = preview.columns.length - 1;

  return (
    <View className="gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <View className="flex-row items-center justify-between">
        <View>
          <Text style={{ fontFamily: 'Inter_500Medium', fontSize: 14, color: '#0f172a' }}>
            Vista previa
          </Text>
          <Text className="mt-0.5 text-xs text-slate-500">
            Mostrando {preview.rows.length} filas de {preview.totalRows.toLocaleString('es')}
          </Text>
        </View>
        <View className="rounded-full bg-slate-100 px-3 py-1">
          <Text className="text-xs text-slate-600">{preview.columns.length} columnas</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        className="rounded-lg border border-slate-200"
      >
        <View>
          <View className="flex-row border-b-2 border-slate-200 bg-slate-50">
            {preview.columns.map((column, index) => (
              <View
                key={`${column.name}::${index}`}
                style={{ width: ANCHO_COLUMNA }}
                className={`px-4 py-3 ${index < ultimoIndice ? 'border-r border-slate-200' : ''}`}
              >
                <Text
                  style={{ fontFamily: 'Inter_500Medium', fontSize: 13, color: '#0f172a' }}
                  numberOfLines={1}
                >
                  {column.name || `Columna ${index + 1}`}
                </Text>
                <Text className="mt-0.5 text-[11px] uppercase tracking-wide text-slate-400">
                  {column.type}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView
            style={{ maxHeight: ALTO_MAXIMO_TABLA }}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            {preview.rows.map((row, rowIndex) => (
              <View
                key={rowIndex}
                className={`flex-row ${
                  rowIndex < preview.rows.length - 1 ? 'border-b border-slate-100' : ''
                } ${rowIndex % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
              >
                {preview.columns.map((column, index) => {
                  const valor = formatValue(row[column.name]);
                  return (
                    <View
                      key={`${column.name}::${index}`}
                      style={{ width: ANCHO_COLUMNA }}
                      className={`justify-center px-4 py-3 ${
                        index < ultimoIndice ? 'border-r border-slate-100' : ''
                      }`}
                    >
                      {valor === null ? (
                        <Text className="text-[13px] text-slate-300">—</Text>
                      ) : (
                        <Text className="text-[13px] text-slate-700" numberOfLines={2}>
                          {valor}
                        </Text>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}
