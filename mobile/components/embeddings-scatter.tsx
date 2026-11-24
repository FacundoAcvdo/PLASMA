import { memo, useMemo, useState } from 'react';
import { Pressable, Text, View, type GestureResponderEvent } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Rect } from 'react-native-svg';
import {
  COLOR_ATIPICO,
  COLORES_CLUSTER,
  type EmbeddingsCluster,
  type EmbeddingsPoint,
} from '@/lib/embeddings/types';

// Puerto de TF-U-FRONTEND/components/charts/embeddings-scatter.tsx.
// La web dibuja en <canvas>; acá se usa react-native-svg (incluido en Expo Go).
// Misma estética: círculos por cluster, atípicos grises, leyenda filtrable,
// zoom y tooltip. El hover de web es tap-en-punto en mobile.

type Props = {
  points: EmbeddingsPoint[];
  clusters: EmbeddingsCluster[];
  outliers: number;
  total: number;
  truncated?: boolean;
};

type Coord = {
  cluster: string;
  x: number;
  y: number;
  sx: number;
  sy: number;
  color: string;
  atipico: boolean;
};

const ALTO_PLOT = 320;
const UMBRAL_TOQUE = 18;
const ZOOM_MIN = 0.6;
const ZOOM_MAX = 2.5;
const PASO_ZOOM = 0.2;

function colorCluster(cluster: string, indexMap: Map<string, number>): string {
  if (cluster === '-1') return COLOR_ATIPICO;
  const idx = indexMap.get(cluster) ?? 0;
  return COLORES_CLUSTER[idx % COLORES_CLUSTER.length];
}

const Puntos = memo(function Puntos({ coords }: { coords: Coord[] }) {
  return (
    <G>
      {coords.map((c, i) => (
        <Circle
          key={i}
          cx={c.sx}
          cy={c.sy}
          r={c.atipico ? 2 : 3.2}
          fill={c.color}
          fillOpacity={c.atipico ? 0.22 : 0.78}
          stroke="#ffffff"
          strokeWidth={0.6}
          strokeOpacity={0.9}
        />
      ))}
    </G>
  );
});

export function EmbeddingsScatter({ points, clusters, outliers, total, truncated }: Props) {
  const [activeCluster, setActiveCluster] = useState<string | null>(null);
  const [showOutliers, setShowOutliers] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [ancho, setAncho] = useState(0);
  const [sel, setSel] = useState<Coord | null>(null);

  const clusterIndex = useMemo(() => {
    const m = new Map<string, number>();
    [...clusters].sort((a, b) => Number(a.id) - Number(b.id)).forEach((c, i) => m.set(c.id, i));
    return m;
  }, [clusters]);

  const filtered = useMemo(
    () =>
      points.filter((p) => {
        if (p.cluster === '-1' && !showOutliers) return false;
        if (activeCluster !== null && p.cluster !== activeCluster) return false;
        return true;
      }),
    [points, activeCluster, showOutliers],
  );

  const bounds = useMemo(() => {
    if (!filtered.length) return { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of filtered) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    const padX = (maxX - minX) * 0.08 || 1;
    const padY = (maxY - minY) * 0.08 || 1;
    return { minX: minX - padX, maxX: maxX + padX, minY: minY - padY, maxY: maxY + padY };
  }, [filtered]);

  const coords = useMemo<Coord[]>(() => {
    if (!ancho || !filtered.length) return [];
    const spanX = bounds.maxX - bounds.minX || 1;
    const spanY = bounds.maxY - bounds.minY || 1;
    const cx = ancho / 2;
    const cy = ALTO_PLOT / 2;
    return filtered.map((p) => {
      const bx = ((p.x - bounds.minX) / spanX) * ancho;
      const by = ALTO_PLOT - ((p.y - bounds.minY) / spanY) * ALTO_PLOT;
      return {
        cluster: p.cluster,
        x: p.x,
        y: p.y,
        sx: cx + (bx - cx) * zoom,
        sy: cy + (by - cy) * zoom,
        color: colorCluster(p.cluster, clusterIndex),
        atipico: p.cluster === '-1',
      };
    });
  }, [filtered, bounds, ancho, zoom, clusterIndex]);

  const alTocar = (e: GestureResponderEvent) => {
    const { locationX, locationY } = e.nativeEvent;
    let best: Coord | null = null;
    let bestDist = Infinity;
    for (const c of coords) {
      const d = Math.hypot(c.sx - locationX, c.sy - locationY);
      if (d < bestDist && d < UMBRAL_TOQUE) {
        bestDist = d;
        best = c;
      }
    }
    setSel(best);
  };

  if (!points.length) {
    return <Text className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Sin puntos para mostrar</Text>;
  }

  const tooltipLeft = sel ? Math.min(Math.max(sel.sx + 10, 4), Math.max(4, ancho - 124)) : 0;
  const tooltipTop = sel ? Math.min(Math.max(sel.sy + 10, 4), ALTO_PLOT - 46) : 0;

  return (
    <View className="w-full">
      {/* leyenda de clusters */}
      <View className="mb-2 flex-row flex-wrap items-center gap-1.5">
        <Pressable
          onPress={() => setActiveCluster(null)}
          className={`rounded-full border px-2.5 py-1 ${
            activeCluster === null
              ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
          }`}
        >
          <Text
            className={`text-xs font-medium ${
              activeCluster === null ? 'text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            Todos ({total})
          </Text>
        </Pressable>

        {clusters.map((c) => {
          const activo = activeCluster === c.id;
          return (
            <Pressable
              key={c.id}
              onPress={() => setActiveCluster(activo ? null : c.id)}
              className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1 ${
                activo ? 'border-slate-900 dark:border-slate-100 bg-slate-900 dark:bg-slate-100' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`}
            >
              <View
                className="size-2 rounded-full"
                style={{ backgroundColor: colorCluster(c.id, clusterIndex) }}
              />
              <Text className={`text-xs ${activo ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-slate-100'}`}>
                c{c.id}
              </Text>
              <Text className={`text-xs ${activo ? 'text-white/70 dark:text-slate-900/70' : 'text-slate-400 dark:text-slate-500'}`}>
                {c.count}
              </Text>
            </Pressable>
          );
        })}

        {outliers > 0 && (
          <Pressable
            onPress={() => setShowOutliers((v) => !v)}
            className={`rounded-full border px-2.5 py-1 ${
              showOutliers ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800'
            }`}
          >
            <Text
              className={`text-xs ${
                showOutliers ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'
              }`}
            >
              atípicos {outliers}
            </Text>
          </Pressable>
        )}
      </View>

      {/* controles de zoom */}
      <View className="mb-2 flex-row items-center justify-end gap-1.5">
        <Pressable
          onPress={() => setZoom((z) => Math.max(ZOOM_MIN, z - PASO_ZOOM))}
          className="size-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <Text className="text-sm text-slate-900 dark:text-slate-100">−</Text>
        </Pressable>
        <Text className="w-10 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
          {Math.round(zoom * 100)}%
        </Text>
        <Pressable
          onPress={() => setZoom((z) => Math.min(ZOOM_MAX, z + PASO_ZOOM))}
          className="size-7 items-center justify-center rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
        >
          <Text className="text-sm text-slate-900 dark:text-slate-100">+</Text>
        </Pressable>
      </View>

      {/* área de dibujo */}
      <View className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <View className="bg-slate-50 dark:bg-slate-900 p-2">
          <View
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
            onLayout={(e) => setAncho(e.nativeEvent.layout.width - 2)}
          >
            <Pressable onPress={alTocar} style={{ height: ALTO_PLOT }}>
              {ancho > 0 && (
                <Svg width={ancho} height={ALTO_PLOT}>
                  <Defs>
                    <ClipPath id="clip">
                      <Rect x={0} y={0} width={ancho} height={ALTO_PLOT} />
                    </ClipPath>
                  </Defs>
                  <G clipPath="url(#clip)">
                    <Puntos coords={coords} />
                  </G>
                </Svg>
              )}
            </Pressable>

            {sel && (
              <View
                pointerEvents="none"
                className="absolute rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                style={{ left: tooltipLeft, top: tooltipTop }}
              >
                <Text className="text-xs font-medium text-slate-900 dark:text-slate-100">
                  {sel.atipico ? 'atípico' : `cluster ${sel.cluster}`}
                </Text>
                <Text className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  x {sel.x.toFixed(3)} · y {sel.y.toFixed(3)}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2">
          <Text className="text-[11px] text-slate-500 dark:text-slate-400">UMAP 2D · coseno · HDBSCAN mín 50 · svg</Text>
          <Text className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
            {coords.length} / {total} puntos {truncated ? '· muestreo 8k' : ''}
          </Text>
        </View>
      </View>

      <Text className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">
        tocá un punto para ver coordenadas · tocá la leyenda para filtrar · ± zoom
      </Text>
    </View>
  );
}
