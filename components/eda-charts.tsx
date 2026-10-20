import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Selector } from '@/components/Selector';
import {
  COLORES_CLASE,
  COLORES_SERIE,
  type ClassStats,
  type DistributionItem,
  type SentenceFreqItem,
  type SentenceStats,
} from '@/lib/eda/types';

// Gráficos con Views puras (sin react-native-svg): mismo aspecto que la web,
// sin dependencias nativas. El hover de web es tap-en-barra en mobile.

const GRIS_EJE = '#64748b';
const ANCHO_EJE_Y = 34;
const ALTO_EJE_X = 26;
const PAD_ARR = 8;

/* ---------- utilidades ---------- */

function ticksEjeY(maximo: number, partes = 4): { ticks: number[]; tope: number } {
  if (!(maximo > 0)) return { ticks: [0], tope: 1 };
  const crudo = maximo / partes;
  const magnitud = Math.pow(10, Math.floor(Math.log10(crudo)));
  const norma = crudo / magnitud;
  const paso = (norma >= 5 ? 5 : norma >= 2 ? 2 : 1) * magnitud;
  const ticks: number[] = [0];
  let v = paso;
  while (v < maximo) {
    ticks.push(Math.round(v * 100) / 100);
    v += paso;
  }
  ticks.push(Math.round(Math.ceil(maximo / paso) * paso * 100) / 100);
  return { ticks, tope: ticks[ticks.length - 1] };
}

function formatearEje(v: number): string {
  return Number.isInteger(v) ? `${v}` : v.toFixed(1);
}

const ETIQUETA_SERIE: Record<string, string> = {
  count: 'cantidad',
  texto: 'Textos',
  words: 'Palabras',
  sentences: 'Oraciones',
  vocabulary: 'Vocabulario',
};

function etiquetaSerie(clave: string): string {
  return ETIQUETA_SERIE[clave] ?? clave;
}

/* ---------- barras agrupadas ---------- */

export type SerieBarra = { clave: string; valores: number[]; color: string };

export function BarrasAgrupadas({
  etiquetas,
  series,
  alto = 240,
  barraMax = 16,
}: {
  etiquetas: string[];
  series: SerieBarra[];
  alto?: number;
  barraMax?: number;
}) {
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const n = etiquetas.length;
  const maximo = Math.max(0, ...series.flatMap((s) => s.valores));
  const { ticks, tope } = ticksEjeY(maximo);

  const plotW = Math.max(0, ancho - ANCHO_EJE_Y);
  const plotH = Math.max(0, alto - PAD_ARR - ALTO_EJE_X);
  const hDe = (v: number) => (tope === 0 ? 0 : (v / tope) * plotH);

  const grupoW = n > 0 ? plotW / n : 0;
  const barraW = n > 0 ? Math.max(2, Math.min(barraMax, (grupoW * 0.66) / series.length)) : 0;
  const pasoEtiqueta = n > 6 ? Math.floor(n / 6) + 1 : 1;

  return (
    <View>
      <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)}>
        {ancho > 0 && (
          <View style={{ height: alto }}>
            <View className="flex-row" style={{ height: alto - ALTO_EJE_X }}>
              <View style={{ width: ANCHO_EJE_Y, height: plotH + PAD_ARR }}>
                {ticks.map((t) => (
                  <Text
                    key={t}
                    style={{
                      position: 'absolute',
                      top: PAD_ARR + plotH - hDe(t) - 7,
                      right: 4,
                      fontSize: 10,
                      color: GRIS_EJE,
                    }}
                  >
                    {formatearEje(t)}
                  </Text>
                ))}
              </View>
              <View className="flex-1">
                <View className="absolute left-0 right-0 top-0">
                  {ticks.map((t) => (
                    <View
                      key={t}
                      style={{ position: 'absolute', top: PAD_ARR + plotH - hDe(t) }}
                      className="h-px w-full bg-slate-200"
                    />
                  ))}
                </View>
                <View className="flex-row" style={{ height: plotH + PAD_ARR, paddingTop: PAD_ARR }}>
                  {etiquetas.map((et, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setSel(sel === i ? null : i)}
                      className="flex-row items-end justify-center"
                      style={{ width: grupoW, height: plotH, opacity: sel === null || sel === i ? 1 : 0.35 }}
                    >
                      {series.map((s) => {
                        const v = s.valores[i] ?? 0;
                        return (
                          <View
                            key={s.clave}
                            style={{
                              width: barraW,
                              height: Math.max(0, hDe(v)),
                              backgroundColor: s.color,
                              borderTopLeftRadius: 3,
                              borderTopRightRadius: 3,
                            }}
                          />
                        );
                      })}
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
            <View className="flex-row" style={{ height: ALTO_EJE_X }}>
              <View style={{ width: ANCHO_EJE_Y }} />
              <View className="flex-1 flex-row">
                {etiquetas.map((et, i) => (
                  <Text
                    key={i}
                    style={{ width: grupoW, fontSize: 10, color: GRIS_EJE }}
                    className="text-center"
                    numberOfLines={1}
                  >
                    {i % pasoEtiqueta === 0 ? et : ''}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}
      </View>
      {sel !== null && etiquetas[sel] !== undefined && (
        <Text className="mt-1 text-center text-xs text-slate-500">
          {etiquetas[sel]} ·{' '}
          {series.map((s) => `${etiquetaSerie(s.clave)}: ${s.valores[sel ?? 0] ?? 0}`).join('  ')}
        </Text>
      )}
    </View>
  );
}

/* ---------- boxplot de oraciones ---------- */

export function EdaSentenceBoxPlot({ stats }: { stats: SentenceStats }) {
  const { min, max, median, q25, q75, mean, std, count } = stats;
  const rango = max - min || 1;
  const aPct = (v: number) => ((v - min) / rango) * 100;

  const q25Pct = aPct(q25);
  const q75Pct = aPct(q75);
  const medPct = aPct(median);
  const meanPct = aPct(mean);

  return (
    <View className="w-full rounded-lg border border-slate-200 bg-white p-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b' }}
        >
          Distribución de oraciones por texto (diagrama de caja)
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular', fontSize: 12, color: '#64748b' }}>
          n {count}
        </Text>
      </View>
      <View className="relative h-12 w-full">
        <View
          style={{ top: 24, height: 1, marginTop: -0.5 }}
          className="absolute left-0 right-0 bg-slate-200"
        />
        <View
          style={{ top: 12, height: 24, left: `${q25Pct}%`, width: `${Math.max(2, q75Pct - q25Pct)}%` }}
          className="absolute rounded-[3px] border border-slate-300 bg-slate-100"
        />
        <View
          style={{ top: 12, height: 24, width: 2, left: `${medPct}%`, marginLeft: -1 }}
          className="absolute bg-slate-900"
        />
        <View
          style={{
            top: 20,
            height: 8,
            width: 8,
            left: `${meanPct}%`,
            transform: [{ translateX: -4 }, { rotate: '45deg' }],
            borderColor: '#0f172a',
          }}
          className="absolute border bg-white"
        />
      </View>
      <View className="mt-1 flex-row flex-wrap gap-x-3 gap-y-1">
        <Text style={{ fontSize: 11, color: '#64748b' }}>mín {min}</Text>
        <Text style={{ fontSize: 11, color: '#64748b' }}>q25 {q25.toFixed(1)}</Text>
        <Text style={{ fontSize: 11, color: '#0f172a', fontFamily: 'Inter_500Medium' }}>
          mediana {median}
        </Text>
        <Text style={{ fontSize: 11, color: '#64748b' }}>q75 {q75.toFixed(1)}</Text>
        <Text style={{ fontSize: 11, color: '#64748b' }}>máx {max}</Text>
        <Text style={{ fontSize: 11, color: '#64748b' }}>
          μ {mean.toFixed(1)} ±{std.toFixed(1)}
        </Text>
      </View>
    </View>
  );
}

/* ---------- frecuencia de oraciones ---------- */

export function EdaSentenceFreq({ data }: { data: SentenceFreqItem[] }) {
  if (!data?.length) {
    return <Text className="text-sm text-slate-500">Sin datos</Text>;
  }
  const etiquetas = data.map((d) =>
    d.bin_end !== undefined ? `${d.sentences}–${d.bin_end}` : `${d.sentences}`,
  );
  return (
    <View className="w-full rounded-lg border border-slate-200 bg-white p-3">
      <Text
        className="mb-2"
        style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b' }}
      >
        Frecuencia de oraciones por texto
      </Text>
      <BarrasAgrupadas
        etiquetas={etiquetas}
        series={[{ clave: 'count', valores: data.map((d) => d.count), color: COLORES_SERIE.texto }]}
        alto={240}
        barraMax={18}
      />
    </View>
  );
}

/* ---------- distribución por clase ---------- */

const OPCIONES_METRICA = [
  { valor: 'all', etiqueta: 'Todos' },
  { valor: 'texto', etiqueta: 'Textos' },
  { valor: 'words', etiqueta: 'Palabras' },
  { valor: 'sentences', etiqueta: 'Oraciones' },
  { valor: 'vocabulary', etiqueta: 'Vocabulario' },
] as const;

type Metrica = (typeof OPCIONES_METRICA)[number]['valor'];

export function EdaClassDistribution({ classStats }: { classStats: ClassStats[] }) {
  const [metrica, setMetrica] = useState<Metrica>('all');
  if (!classStats?.length) {
    return <Text className="text-sm text-slate-500">Sin datos</Text>;
  }

  const series: SerieBarra[] =
    metrica === 'all'
      ? (['texto', 'words', 'sentences', 'vocabulary'] as const).map((k) => ({
          clave: k,
          valores: classStats.map((c) => c[k]),
          color: COLORES_SERIE[k],
        }))
      : [
          {
            clave: metrica,
            valores: classStats.map((c) => c[metrica as keyof ClassStats] as number),
            color: COLORES_SERIE[metrica],
          },
        ];

  return (
    <View className="w-full rounded-lg border border-slate-200 bg-white p-3">
      <View className="mb-2 flex-row items-center justify-between gap-2">
        <Text
          className="flex-1"
          style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b' }}
        >
          {metrica === 'all'
            ? 'Distribución por clase (tocá para valores)'
            : `Distribución por clase — ${etiquetaSerie(metrica)}`}
        </Text>
        <View className="w-36">
          <Selector
            etiqueta=""
            valor={metrica}
            opciones={OPCIONES_METRICA.map((o) => ({ ...o }))}
            onCambiar={(v) => setMetrica(v as Metrica)}
          />
        </View>
      </View>
      <BarrasAgrupadas
        etiquetas={classStats.map((c) => c.clase)}
        series={series}
        alto={300}
        barraMax={metrica === 'all' ? 16 : 48}
      />
      <Text className="mt-1 text-center text-[11px] text-slate-500">
        {metrica === 'all' ? 'texto · palabras · oraciones · vocabulario' : `solo ${etiquetaSerie(metrica)} — escala ajustada`}
      </Text>
    </View>
  );
}

/* ---------- histograma por clase ---------- */

export function EdaDistribution({ distribution }: { distribution: DistributionItem[] }) {
  const [modo, setModo] = useState<'words' | 'sentences'>('words');
  if (!distribution?.length) {
    return <Text className="text-sm text-slate-500">Sin datos</Text>;
  }

  const hist0 = distribution[0]?.[modo === 'words' ? 'words_histogram' : 'sentences_histogram'] ?? [];
  const etiquetas = hist0.map((b) => `${b.bin_start}–${b.bin_end}`);
  const series: SerieBarra[] = distribution.map((d, i) => ({
    clave: d.clase,
    valores: (d[modo === 'words' ? 'words_histogram' : 'sentences_histogram'] ?? []).map(
      (b) => b?.count ?? 0,
    ),
    color: COLORES_CLASE[i % COLORES_CLASE.length],
  }));

  return (
    <View className="w-full rounded-lg border border-slate-200 bg-white p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <Text
          className="flex-1"
          style={{ fontFamily: 'Inter_500Medium', fontSize: 12, color: '#64748b' }}
        >
          Histograma por clase — {modo === 'words' ? 'palabras por texto' : 'oraciones por texto'}
        </Text>
        <View className="flex-row rounded-md border border-slate-200 p-0.5">
          {(['words', 'sentences'] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => setModo(m)}
              className={`rounded px-2 py-1 ${modo === m ? 'bg-slate-900' : ''}`}
            >
              <Text
                className={`text-xs ${modo === m ? 'text-white' : 'text-slate-500'}`}
              >
                {m === 'words' ? 'palabras' : 'oraciones'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <BarrasAgrupadas etiquetas={etiquetas} series={series} alto={280} barraMax={16} />
      <Text className="mt-1 text-center text-[11px] text-slate-500">
        tocá para conteo por clase
      </Text>
    </View>
  );
}
