import type { ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import { useTema } from '@/context/tema-context';

// Espejo de la línea de tiempo horizontal de
// TF-U-FRONTEND/components/views/{word-evolution,sentiment-time}-view.tsx.
// Scaffolding genérico: recibe las tarjetas ya construidas y las alterna
// arriba/abajo sobre un eje central.

const COL_W = 200;
const CARD_W = 280;
const ALTO = 520;
const CENTRO = ALTO / 2;
const PAD = 64;

export type TimelineItem = { key: string; content: ReactNode };

export function EvolutionTimeline({ items = [] }: { items?: TimelineItem[] }) {
  const { colores } = useTema();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={{ height: ALTO }}>
        {/* eje central */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: CENTRO - 0.5,
            height: 1,
            backgroundColor: colores.borde,
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', height: ALTO, paddingHorizontal: PAD }}>
          {items.map((item, index) => {
            const esArriba = index % 2 === 0;
            return (
              <View key={item.key} style={{ width: COL_W, height: ALTO }}>
                {/* punto sobre el eje */}
                <View
                  className="rounded-full border-2 border-primario dark:border-primario-400 bg-white dark:bg-slate-900"
                  style={{
                    position: 'absolute',
                    left: COL_W / 2 - 8,
                    top: CENTRO - 8,
                    width: 16,
                    height: 16,
                  }}
                />

                {/* conector punto ↔ tarjeta */}
                <View
                  style={{
                    position: 'absolute',
                    left: COL_W / 2 - 0.5,
                    width: 1,
                    height: 48,
                    backgroundColor: colores.borde,
                    ...(esArriba ? { bottom: CENTRO } : { top: CENTRO }),
                  }}
                />

                {/* tarjeta */}
                <View
                  style={{
                    position: 'absolute',
                    left: COL_W / 2 - CARD_W / 2,
                    width: CARD_W,
                    ...(esArriba ? { bottom: CENTRO + 48 } : { top: CENTRO + 48 }),
                  }}
                >
                  {/* flecha hacia el eje */}
                  <View
                    style={{
                      position: 'absolute',
                      left: CARD_W / 2 - 6,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 6,
                      borderRightWidth: 6,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      ...(esArriba
                        ? { bottom: -6, borderBottomWidth: 6, borderBottomColor: colores.borde }
                        : { top: -6, borderTopWidth: 6, borderTopColor: colores.borde }),
                    }}
                  />
                  <View
                    style={{
                      position: 'absolute',
                      left: CARD_W / 2 - 6,
                      width: 0,
                      height: 0,
                      borderLeftWidth: 6,
                      borderRightWidth: 6,
                      borderLeftColor: 'transparent',
                      borderRightColor: 'transparent',
                      ...(esArriba
                        ? { bottom: -4, borderBottomWidth: 6, borderBottomColor: colores.superficie }
                        : { top: -4, borderTopWidth: 6, borderTopColor: colores.superficie }),
                    }}
                  />

                  {item.content}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}
