import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  BarChart3,
  CheckCircle2,
  FileDown,
  FileText,
  Hash,
  Link2,
  MessageCircle,
  Smile,
  Users,
} from 'lucide-react-native';
import type { CleaningResult } from '@/lib/limpieza/types';

// Espejo de TF-U-FRONTEND/lib/data-cleaning/cleaning-results.tsx.
// Mismas tarjetas, métricas y textos; grid de web adaptado a 2 columnas en móvil.

const num = (v: number) => v.toLocaleString();

function StatCard({ label, value, icono }: { label: string; value: number; icono: ReactNode }) {
  return (
    <View className="w-[48%] flex-row items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <View className="size-10 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        {icono}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs text-slate-500">{label}</Text>
        <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="mt-0.5 text-lg text-slate-900">
          {num(value)}
        </Text>
      </View>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4">
      <Text className="text-xs text-slate-500">{label}</Text>
      <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="mt-1 text-base text-slate-900">
        {num(value)}
      </Text>
    </View>
  );
}

function IconoDoble() {
  return (
    <View className="items-center justify-center">
      <Text style={{ fontFamily: 'Inter_700Bold', fontSize: 13, color: '#0f172a' }}>2×</Text>
    </View>
  );
}

function TarjetaTitulo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <View className="rounded-xl border border-slate-200 bg-white">
      <View className="border-b border-slate-100 px-4 py-3">
        <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0f172a' }}>
          {titulo}
        </Text>
      </View>
      <View className="p-4">{children}</View>
    </View>
  );
}

export function LimpiezaResultado({
  result,
  onDownload,
}: {
  result: CleaningResult;
  onDownload: () => void;
}) {
  const { stats } = result;

  return (
    <View className="gap-4">
      {/* Header */}
      <View className="flex-row items-center gap-4 rounded-xl border border-slate-200 bg-white p-5">
        <View className="size-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
          <CheckCircle2 size={24} color="#4f46e5" />
        </View>
        <View className="min-w-0 flex-1">
          <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-base text-slate-900">
            Limpieza completada
          </Text>
          <Text className="mt-0.5 text-sm text-slate-500" numberOfLines={1}>
            {result.filename}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={onDownload}
        className="flex-row items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5"
      >
        <FileDown size={18} color="#fff" />
        <Text style={{ fontFamily: 'Inter_600SemiBold' }} className="text-base text-white">
          Descargar dataset
        </Text>
      </Pressable>

      {/* Resumen */}
      <View className="flex-row flex-wrap gap-3">
        <StatCard label="Filas originales" value={stats.original_rows} icono={<FileText size={18} color="#334155" />} />
        <StatCard label="Filas finales" value={stats.cleaned_rows} icono={<CheckCircle2 size={18} color="#334155" />} />
        <StatCard label="Tokens originales" value={stats.original_tokens} icono={<BarChart3 size={18} color="#334155" />} />
        <StatCard label="Tokens finales" value={stats.cleaned_tokens} icono={<BarChart3 size={18} color="#334155" />} />
      </View>

      {/* Procesamiento */}
      <TarjetaTitulo titulo="Procesamiento realizado">
        <View className="flex-row flex-wrap gap-3">
          <StatCard label="Duplicados eliminados" value={stats.removed_duplicates} icono={<IconoDoble />} />
          <StatCard label="URLs eliminadas" value={stats.removed_urls} icono={<Link2 size={18} color="#334155" />} />
          <StatCard label="Menciones eliminadas" value={stats.removed_mentions} icono={<MessageCircle size={18} color="#334155" />} />
          <StatCard label="Emojis procesados" value={stats.emojis_processed} icono={<Smile size={18} color="#334155" />} />
          <StatCard label="Hashtags procesados" value={stats.hashtags_processed} icono={<Hash size={18} color="#334155" />} />
          <StatCard label="Entidades anonimizadas" value={stats.entities_anonymized} icono={<Users size={18} color="#334155" />} />
          <StatCard label="Stopwords eliminadas" value={stats.stopwords_removed} icono={<MessageCircle size={18} color="#334155" />} />
        </View>
      </TarjetaTitulo>

      {/* Métricas adicionales */}
      <TarjetaTitulo titulo="Métricas adicionales">
        <View className="flex-row flex-wrap gap-3">
          <View className="w-[48%]">
            <Metric label="Espacios normalizados" value={stats.normalized_whitespace} />
          </View>
          <View className="w-[48%]">
            <Metric label="Puntuación eliminada" value={stats.punctuation_removed} />
          </View>
          <View className="w-[48%]">
            <Metric label="Lemas procesados" value={stats.lemmas_processed} />
          </View>
          <View className="w-[48%]">
            <Metric label="Truncados procesados" value={stats.truncated_words} />
          </View>
          <View className="w-[48%]">
            <Metric label="Términos únicos originales" value={stats.original_unique_terms} />
          </View>
          <View className="w-[48%]">
            <Metric label="Términos únicos finales" value={stats.cleaned_unique_terms} />
          </View>
          <View className="w-[48%]">
            <Metric
              label="Filas eliminadas"
              value={Math.max(stats.original_rows - stats.cleaned_rows, 0)}
            />
          </View>
        </View>
      </TarjetaTitulo>

      {/* Preview */}
      <TarjetaTitulo titulo="Vista previa de cambios">
        {result.previews.length === 0 ? (
          <View className="rounded-lg border border-dashed border-slate-300 p-6">
            <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-center text-sm text-slate-900">
              No hay cambios de texto para mostrar.
            </Text>
            <Text className="mt-1 text-center text-xs text-slate-500">
              Las operaciones seleccionadas no modificaron el contenido de los documentos mostrados.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {result.previews.map((preview, index) => (
              <View key={index} className="overflow-hidden rounded-xl border border-slate-200">
                <View className="border-b border-slate-100 bg-slate-50 px-4 py-2">
                  <Text className="text-xs text-slate-500">Documento {index + 1}</Text>
                </View>
                <View className="border-b border-slate-100 p-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Original
                  </Text>
                  <Text className="text-sm leading-relaxed text-slate-700">
                    {preview.original}
                  </Text>
                </View>
                <View className="p-4">
                  <Text className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Limpio
                  </Text>
                  <Text className="text-sm leading-relaxed text-slate-700">
                    {preview.cleaned}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </TarjetaTitulo>
    </View>
  );
}
