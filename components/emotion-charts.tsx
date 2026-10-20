import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { FUENTE } from '@/components/ui';
import {
  ETIQUETA_METRICA,
  etiquetaEmocion,
  type ClassStat,
  type CorpusStats,
  type Correlation,
  type DistributionItem,
  type EmotionStats,
  type MetricaClase,
} from '@/lib/emotions/types';

// Puerto de TF-U-FRONTEND/components/charts/emotion-*.tsx.
// Gráficos con Views puras (como EDA). El hover de web es tap-en-elemento:
// al tocar se resalta y aparece un panel de detalle debajo.

const AZUL = '#2563eb';
const TINTE = '#4f46e5';

function SinDatos() {
  return <Text className="py-4 text-center text-sm text-slate-500">Sin datos</Text>;
}

/* ---------- corpus: barras horizontales (media) ---------- */

export function EmotionCorpusMeanBars({ corpusStats }: { corpusStats: CorpusStats }) {
  const data = useMemo(
    () =>
      Object.entries(corpusStats)
        .map(([emotion, s]) => ({
          emotion,
          mean: Number(s.mean.toFixed(4)),
          std: Number(s.std.toFixed(4)),
          median: s.median,
          count: s.count,
        }))
        .sort((a, b) => b.mean - a.mean),
    [corpusStats],
  );
  const [sel, setSel] = useState<string | null>(null);

  if (!data.length) return <SinDatos />;

  const maxMean = Math.max(...data.map((d) => d.mean));
  const xMax = Math.max(maxMean * 1.25, 0.01);
  const selItem = data.find((d) => d.emotion === sel) ?? null;

  return (
    <View className="w-full">
      <View className="gap-1.5">
        {data.map((d) => {
          const activo = sel === d.emotion;
          return (
            <Pressable
              key={d.emotion}
              onPress={() => setSel(activo ? null : d.emotion)}
              className={`flex-row items-center gap-2 rounded-md px-1 py-1 ${
                activo ? 'bg-slate-50' : ''
              }`}
            >
              <Text
                numberOfLines={1}
                className="text-xs text-slate-700"
                style={{ width: 92, fontFamily: FUENTE.medium }}
              >
                {etiquetaEmocion(d.emotion)}
              </Text>
              <View className="h-2.5 flex-1 overflow-hidden rounded-sm bg-slate-100">
                <View
                  className="h-full rounded-sm"
                  style={{ width: `${(d.mean / xMax) * 100}%`, backgroundColor: AZUL, opacity: 0.9 }}
                />
              </View>
              <Text className="font-mono text-[10px] text-slate-500" style={{ width: 42, textAlign: 'right' }}>
                {d.mean.toFixed(3)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selItem && (
        <View className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Text className="text-xs font-medium text-slate-900">{etiquetaEmocion(selItem.emotion)}</Text>
          <Text className="mt-0.5 font-mono text-[11px] text-slate-500">
            media <Text className="text-slate-900">{selItem.mean.toFixed(3)}</Text> ±{selItem.std.toFixed(3)}
          </Text>
          <Text className="font-mono text-[11px] text-slate-500">
            mediana <Text className="text-slate-900">{selItem.median.toFixed(3)}</Text> · n {selItem.count}
          </Text>
        </View>
      )}

      <Text className="mt-2 text-center text-[11px] text-slate-500">
        ordenado por media descendente · tocá para ver desv. est. y mediana
      </Text>
    </View>
  );
}

/* ---------- corpus: distribución (boxplot por emoción) ---------- */

function BoxPlotMini({ item }: { item: DistributionItem }) {
  const s = item.stats;
  const toPct = (v: number) => Math.max(0, Math.min(100, v * 100));
  const q25 = toPct(s.q25);
  const q75 = toPct(s.q75);
  const median = toPct(s.median);
  const mean = toPct(s.mean);
  const min = toPct(s.min);
  const max = toPct(s.max);

  return (
    <View className="relative h-5 w-full">
      <View style={{ position: 'absolute', top: '50%', height: 1, left: 0, right: 0 }} className="bg-slate-200" />
      <View
        style={{ position: 'absolute', top: '50%', height: 1, left: `${min}%`, width: `${max - min}%` }}
        className="bg-slate-400/50"
      />
      <View
        style={{
          position: 'absolute',
          top: '50%',
          height: 12,
          marginTop: -6,
          left: `${q25}%`,
          width: `${Math.max(1.5, q75 - q25)}%`,
        }}
        className="rounded-[3px] border border-slate-300 bg-slate-100"
      />
      <View
        style={{ position: 'absolute', top: '50%', height: 12, width: 1, marginTop: -6, left: `${median}%` }}
        className="bg-slate-900"
      />
      <View
        style={{
          position: 'absolute',
          top: '50%',
          height: 6,
          width: 6,
          marginTop: -3,
          marginLeft: -3,
          left: `${mean}%`,
          transform: [{ rotate: '45deg' }],
        }}
        className="border border-slate-900 bg-white"
      />
    </View>
  );
}

export function EmotionDistributionList({ distribution }: { distribution: DistributionItem[] }) {
  const [sel, setSel] = useState<string | null>(null);
  if (!distribution?.length) return <SinDatos />;
  const item = distribution.find((d) => d.emotion === sel) ?? null;
  const maxBin = item ? Math.max(...item.histogram.map((h) => h.count), 1) : 1;

  return (
    <View className="w-full">
      <View className="rounded-lg border border-slate-200 bg-white">
        <View className="flex-row items-center gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
          <Text className="text-[11px] font-medium text-slate-500" style={{ width: 96 }}>
            emoción
          </Text>
          <Text className="flex-1 text-[11px] font-medium text-slate-500">distribución</Text>
          <Text className="text-right text-[11px] font-medium text-slate-500" style={{ width: 78 }}>
            media
          </Text>
        </View>
        {distribution.map((d) => {
          const activo = sel === d.emotion;
          return (
            <Pressable
              key={d.emotion}
              onPress={() => setSel(activo ? null : d.emotion)}
              className={`flex-row items-center gap-2 border-b border-slate-50 px-3 py-2.5 ${
                activo ? 'bg-slate-50' : ''
              }`}
            >
              <Text numberOfLines={1} className="text-xs text-slate-900" style={{ width: 96 }}>
                {etiquetaEmocion(d.emotion)}
              </Text>
              <View className="flex-1">
                <BoxPlotMini item={d} />
              </View>
              <Text className="text-right font-mono text-[11px] text-slate-900" style={{ width: 78 }}>
                {d.stats.mean.toFixed(3)}
                <Text className="text-slate-500"> ±{d.stats.std.toFixed(2)}</Text>
              </Text>
            </Pressable>
          );
        })}
        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1 bg-slate-50 px-3 py-2">
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-3 rounded-[2px] border border-slate-300 bg-slate-100" />
            <Text className="text-[11px] text-slate-500">q25–q75</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="h-2.5 w-px bg-slate-900" />
            <Text className="text-[11px] text-slate-500">mediana</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <View className="size-1.5 rotate-45 border border-slate-900 bg-white" />
            <Text className="text-[11px] text-slate-500">media</Text>
          </View>
          <Text className="ml-auto font-mono text-[10px] text-slate-500">escala 0 — 1</Text>
        </View>
      </View>

      {item && (
        <View className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Text className="text-sm font-medium text-slate-900">{etiquetaEmocion(item.emotion)}</Text>
          <View className="mt-1.5 flex-row flex-wrap gap-x-4 gap-y-0.5">
            <Text className="font-mono text-[11px] text-slate-500">media {item.stats.mean.toFixed(3)}</Text>
            <Text className="font-mono text-[11px] text-slate-500">±{item.stats.std.toFixed(3)}</Text>
            <Text className="font-mono text-[11px] text-slate-500">mediana {item.stats.median.toFixed(3)}</Text>
            <Text className="font-mono text-[11px] text-slate-500">n {item.stats.count}</Text>
            <Text className="font-mono text-[11px] text-slate-500">q25 {item.stats.q25.toFixed(3)}</Text>
            <Text className="font-mono text-[11px] text-slate-500">q75 {item.stats.q75.toFixed(3)}</Text>
          </View>
          <View className="mt-2 h-7 flex-row items-end gap-px">
            {item.histogram.map((h, i) => (
              <View
                key={i}
                className="flex-1 rounded-[1px] bg-slate-900/15"
                style={{ height: `${(h.count / maxBin) * 100}%` }}
              />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

/* ---------- corpus: heatmap de correlación ---------- */

function opacidadCorrelacion(v: number): number {
  return (Math.max(-1, Math.min(1, v)) + 1) / 2;
}

const HEADER_CORR = 64;
const CELDA_CORR = 44;

export function EmotionCorrelationHeatmap({
  correlation,
  topWords,
}: {
  correlation: Correlation;
  topWords?: Record<string, string[]>;
}) {
  const { matrix, order } = correlation;
  const [sel, setSel] = useState<{ x: string; y: string; v: number } | null>(null);

  if (!matrix?.length) return <SinDatos />;

  return (
    <View className="w-full">
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="rounded-lg border border-slate-200 bg-white p-3">
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: HEADER_CORR }} />
            {order.map((emo) => (
              <View key={emo} style={{ width: CELDA_CORR }} className=" px-0.5 py-1">
                <Text numberOfLines={1} className="text-center text-[10px] font-medium text-slate-500">
                  {etiquetaEmocion(emo)}
                </Text>
              </View>
            ))}
          </View>

          {order.map((rowEmo, i) => (
            <View key={rowEmo} style={{ flexDirection: 'row' }} className="mt-px">
              <View style={{ width: HEADER_CORR }} className="items-end justify-center pr-1">
                <Text numberOfLines={1} className="text-[10px] font-medium text-slate-500">
                  {etiquetaEmocion(rowEmo)}
                </Text>
              </View>
              {order.map((colEmo, j) => {
                const v = matrix[i][j];
                const isDiag = i === j;
                const activo = sel?.x === colEmo && sel?.y === rowEmo;
                return (
                  <Pressable
                    key={`${rowEmo}-${colEmo}`}
                    onPress={() => setSel(activo ? null : { x: colEmo, y: rowEmo, v })}
                    style={{ height: CELDA_CORR, width: CELDA_CORR }}
                    className="relative items-center justify-center bg-white"
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: TINTE,
                        opacity: isDiag ? 0.08 + opacidadCorrelacion(v) * 0.9 : opacidadCorrelacion(v) * 0.22,
                      }}
                    />
                    {activo && (
                      <View
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        className="border border-slate-900"
                      />
                    )}
                    <Text className="font-mono text-[10px] text-slate-600">{v.toFixed(2)}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View className="mt-3 flex-row items-center gap-2">
            <Text className="font-mono text-[11px] text-slate-500">-1</Text>
            <View className="h-1 flex-1 flex-row overflow-hidden rounded-full bg-slate-200">
              <View className="flex-1 bg-slate-200" />
              <View className="flex-1" style={{ backgroundColor: TINTE, opacity: 0.2 }} />
              <View className="flex-1" style={{ backgroundColor: TINTE }} />
            </View>
            <Text className="font-mono text-[11px] text-slate-500">+1</Text>
            <Text className="ml-2 text-[11px] text-slate-500">Pearson r</Text>
          </View>
        </View>
      </ScrollView>

      {sel && (
        <View className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Text className="text-xs font-medium text-slate-900">
            {etiquetaEmocion(sel.y)} ↔ {etiquetaEmocion(sel.x)}
          </Text>
          <Text className="font-mono text-[11px] text-slate-500">
            r <Text className="text-slate-900">{sel.v.toFixed(3)}</Text>
          </Text>
          {topWords && (
            <View className="mt-1.5 flex-row gap-3 border-t border-slate-200 pt-1.5">
              <View className="flex-1">
                <Text className="text-[11px] font-medium text-slate-900">{etiquetaEmocion(sel.y)}</Text>
                <Text className="font-mono text-[11px] text-slate-500">
                  {(topWords[sel.y] || []).slice(0, 3).join(' · ') || '—'}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="text-[11px] font-medium text-slate-900">{etiquetaEmocion(sel.x)}</Text>
                <Text className="font-mono text-[11px] text-slate-500">
                  {(topWords[sel.x] || []).slice(0, 3).join(' · ') || '—'}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

/* ---------- por clase: heatmap métrica x emoción ---------- */

const HEADER_CLASE = 92;
const CELDA_CLASE = 46;

function valorMetrica(row: ClassStat, emo: string, m: MetricaClase): number {
  const s = row[emo] as EmotionStats | undefined;
  return s ? (s[m] ?? 0) : 0;
}

export function EmotionClassHeatmap({
  classStats,
  emotions,
  metric,
}: {
  classStats: ClassStat[];
  emotions: string[];
  metric: MetricaClase;
}) {
  const [sel, setSel] = useState<{ clase: string; emo: string; v: number; words: string[] } | null>(null);

  const emoOrder = useMemo(
    () =>
      [...emotions].sort((a, b) => {
        const avgA =
          classStats.reduce((s, c) => s + valorMetrica(c, a, metric), 0) / (classStats.length || 1);
        const avgB =
          classStats.reduce((s, c) => s + valorMetrica(c, b, metric), 0) / (classStats.length || 1);
        return avgB - avgA;
      }),
    [emotions, classStats, metric],
  );

  const { min, max } = useMemo(() => {
    const all = classStats.flatMap((c) => emoOrder.map((e) => valorMetrica(c, e, metric)));
    return all.length ? { min: Math.min(...all), max: Math.max(...all) } : { min: 0, max: 1 };
  }, [classStats, emoOrder, metric]);
  const range = max - min || 1;

  if (!classStats?.length) return <SinDatos />;

  return (
    <View className="w-full">
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View className="rounded-lg border border-slate-200 bg-white p-3">
          <View style={{ flexDirection: 'row' }}>
            <View style={{ width: HEADER_CLASE }} className="px-1 py-1.5">
              <Text className="text-[11px] font-medium text-slate-500">clase</Text>
            </View>
            {emoOrder.map((emo) => (
              <View key={emo} style={{ width: CELDA_CLASE }} className="px-0.5 py-1.5">
                <Text numberOfLines={1} className="text-center text-[10px] font-medium text-slate-500">
                  {etiquetaEmocion(emo)}
                </Text>
              </View>
            ))}
          </View>

          {classStats.map((row) => (
            <View key={row.clase} style={{ flexDirection: 'row' }} className="mt-px">
              <View
                style={{ width: HEADER_CLASE }}
                className="flex-row items-center gap-1.5 px-1 py-2"
              >
                <Text numberOfLines={1} className="flex-1 text-[11px] font-medium text-slate-900">
                  {row.clase}
                </Text>
                <Text className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[9px] text-slate-500">
                  {row.count}
                </Text>
              </View>
              {emoOrder.map((emo) => {
                const v = valorMetrica(row, emo, metric);
                const t = (v - min) / range;
                const palabras = (row[emo] as EmotionStats | undefined)?.top_words ?? [];
                const activo = sel?.clase === row.clase && sel?.emo === emo;
                return (
                  <Pressable
                    key={`${row.clase}-${emo}`}
                    onPress={() =>
                      setSel(activo ? null : { clase: row.clase, emo, v, words: palabras })
                    }
                    style={{ height: 36, width: CELDA_CLASE }}
                    className="relative items-center justify-center bg-white"
                  >
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: TINTE,
                        opacity: t * 0.22,
                      }}
                    />
                    {activo && (
                      <View
                        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                        className="border border-slate-900"
                      />
                    )}
                    <Text
                      className={`font-mono text-[9px] ${t > 0.5 ? 'text-slate-900' : 'text-slate-500'}`}
                    >
                      {v.toFixed(3)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ))}

          <View className="mt-3 flex-row items-center gap-2">
            <Text className="font-mono text-[11px] text-slate-500">{min.toFixed(3)}</Text>
            <View className="h-1 flex-1 flex-row overflow-hidden rounded-full bg-slate-200">
              <View className="flex-1 bg-slate-200" />
              <View className="flex-1" style={{ backgroundColor: TINTE, opacity: 0.2 }} />
              <View className="flex-1" style={{ backgroundColor: TINTE }} />
            </View>
            <Text className="font-mono text-[11px] text-slate-500">{max.toFixed(3)}</Text>
            <Text className="ml-2 text-[11px] text-slate-500">{ETIQUETA_METRICA[metric]}</Text>
          </View>
        </View>
      </ScrollView>

      {sel && (
        <View className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <Text className="text-xs font-medium text-slate-900">
            {sel.clase} · {etiquetaEmocion(sel.emo)}
          </Text>
          <Text className="font-mono text-[11px] text-slate-500">
            {ETIQUETA_METRICA[metric]} <Text className="text-slate-900">{sel.v.toFixed(4)}</Text>
          </Text>
          {sel.words.length > 0 && (
            <Text className="mt-1 border-t border-slate-200 pt-1 font-mono text-[11px] text-slate-500">
              más frecuentes: <Text className="text-slate-900">{sel.words.slice(0, 3).join(' · ')}</Text>
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
