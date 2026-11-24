import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { FUENTE } from '@/components/ui';
import { useTema } from '@/context/tema-context';
import type { WordFreq } from '@/lib/wordcloud/types';

// Puerto de TF-U-FRONTEND/components/charts/wordcloud-interactive.tsx.
// Mismo layout en espiral (JS puro, sin rotación, frecuencia grande al centro).
// El hover de web es tap-en-palabra en mobile; el filtro y el tooltip se replican.

type Props = {
  frequencies: WordFreq[];
  total_words: number;
  max_count: number;
};

type Placed = WordFreq & { x: number; y: number; w: number; h: number; size: number; opacity: number };

const ALTO_MAX = 480;
const MAX_PALABRAS = 130;
const PAD = 0.8;
// Angulo aureo: reemplaza Math.random() (impuro en render) por un inicio
// determinista de la espiral; mismo efecto visual y layout estable.
const ANGULO_AUREO = 2.399963229728653;

function seSolapan(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
) {
  return !(a.x + a.w < b.x || b.x + b.w < a.x || a.y + a.h < b.y || b.y + b.h < a.y);
}

function fuentePorRango(rank: number): string {
  if (rank <= 5) return FUENTE.bold;
  if (rank <= 12) return FUENTE.semibold;
  if (rank <= 25) return FUENTE.medium;
  return FUENTE.regular;
}

export function WordCloudInteractive({ frequencies, total_words, max_count }: Props) {
  const { colores } = useTema();
  const [filtro, setFiltro] = useState('');
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<Placed | null>(null);

  const filtered = useMemo(() => {
    if (!filtro) return frequencies;
    const q = filtro.toLowerCase();
    return frequencies.filter((w) => w.text.includes(q));
  }, [frequencies, filtro]);

  const placed = useMemo<Placed[]>(() => {
    if (!filtered.length || ancho <= 0) return [];
    const W = ancho;
    const H = ALTO_MAX;
    const cx = W / 2;
    const cy = H / 2;
    const rects: { x: number; y: number; w: number; h: number }[] = [];
    const result: Placed[] = [];
    const words = filtered.slice(0, MAX_PALABRAS);

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const ratio = w.count / (max_count || 1);
      // contraste extremo: top muy grande, resto cae rápido (exp 1.65)
      const size = 10 + Math.pow(ratio, 1.65) * 48;
      const opacity = 0.5 + ratio * 0.5;
      const boxW = w.text.length * size * 0.58;
      const boxH = size * 1.06;

      if (result.length === 0) {
        const x = cx - boxW / 2;
        const y = cy - boxH / 2;
        rects.push({ x, y, w: boxW, h: boxH });
        result.push({ ...w, x, y, w: boxW, h: boxH, size, opacity });
        continue;
      }

      let angle = ((i + 1) * ANGULO_AUREO) % (Math.PI * 2);
      let radius = 0;
      for (let attempt = 0; attempt < 1200; attempt++) {
        angle += 0.38;
        radius += 0.9;
        const x = cx + Math.cos(angle) * radius - boxW / 2;
        const y = cy + Math.sin(angle) * radius - boxH / 2;
        if (x < 1 || y < 1 || x + boxW > W - 1 || y + boxH > H - 1) continue;
        let coll = false;
        for (const pr of rects) {
          const box = { x: x - PAD, y: y - PAD, w: boxW + PAD * 2, h: boxH + PAD * 2 };
          if (seSolapan(box, pr)) {
            coll = true;
            break;
          }
        }
        if (!coll) {
          rects.push({ x, y, w: boxW, h: boxH });
          result.push({ ...w, x, y, w: boxW, h: boxH, size, opacity });
          break;
        }
      }
    }
    return result;
  }, [filtered, ancho, max_count]);

  if (!frequencies.length) {
    return <Text className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin palabras para mostrar</Text>;
  }

  const tooltipLeft = sel ? Math.min(sel.x + sel.w + 6, Math.max(0, ancho - 162)) : 0;
  const tooltipTop = sel ? Math.min(Math.max(sel.y, 0), ALTO_MAX - 92) : 0;

  return (
    <View className="w-full">
      {/* filtro */}
      <View className="mb-3 flex-row items-center gap-2">
        <TextInput
          placeholder="filtrar palabra..."
          placeholderTextColor={colores.textoMuted}
          value={filtro}
          onChangeText={setFiltro}
          autoCapitalize="none"
          autoCorrect={false}
          style={{ fontFamily: FUENTE.regular }}
          className="h-8 w-44 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 text-xs text-slate-900 dark:text-slate-100"
        />
        <Text className="text-xs text-slate-500 dark:text-slate-400">
          {placed.length} / {frequencies.length} visibles
        </Text>
      </View>

      {/* nube */}
      <View
        className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        style={{ height: ALTO_MAX }}
        onLayout={(e) => setAncho(e.nativeEvent.layout.width - 2)}
      >
        {placed.map((w) => {
          const activo = sel?.text === w.text;
          return (
            <Pressable
              key={w.text}
              onPress={() => setSel(activo ? null : w)}
              className={`absolute items-center justify-center rounded px-0.5 ${
                activo ? 'bg-slate-100 dark:bg-slate-800' : ''
              }`}
              style={{ left: w.x, top: w.y, width: w.w, height: w.h }}
            >
              <Text
                numberOfLines={1}
                style={{
                  color: colores.texto,
                  fontSize: w.size,
                  opacity: w.opacity,
                  fontFamily: fuentePorRango(w.rank),
                  letterSpacing: w.rank <= 5 ? -w.size * 0.03 : -w.size * 0.015,
                  lineHeight: w.size * 1.05,
                }}
              >
                {w.text}
              </Text>
            </Pressable>
          );
        })}

        {sel && (
          <View
            pointerEvents="none"
            className="absolute rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2"
            style={{ left: tooltipLeft, top: tooltipTop, width: 156 }}
          >
            <Text
              numberOfLines={1}
              className="text-sm text-slate-900 dark:text-slate-100"
              style={{ fontFamily: FUENTE.semibold }}
            >
              {sel.text}
            </Text>
            <Text className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400">
              apariciones <Text className="text-slate-900 dark:text-slate-100">{sel.count}</Text> ({sel.percentage}% del corpus)
            </Text>
            <Text className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
              en <Text className="text-slate-900 dark:text-slate-100">{sel.doc_frequency}</Text> documentos ({sel.doc_percentage}%)
            </Text>
            <Text className="font-mono text-[11px] text-slate-500 dark:text-slate-400">puesto #{sel.rank}</Text>
          </View>
        )}
      </View>

      {/* pie */}
      <View className="mt-3 flex-row items-center justify-between gap-2">
        <Text className="flex-1 text-[11px] text-slate-500 dark:text-slate-400">
          {total_words.toLocaleString()} palabras · {frequencies.length} únicas (200 principales)
        </Text>
        <Text className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
          máx {max_count} · visibles {placed.length}
        </Text>
      </View>

      <Text className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        centro = más frecuente · sin rotación · tocá una palabra para estadísticas
      </Text>
    </View>
  );
}
