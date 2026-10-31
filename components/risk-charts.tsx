import { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { FUENTE } from '@/components/ui';
import { useTema } from '@/context/tema-context';
import {
  NIVEL_META,
  segmentosResaltados,
  type Nivel,
} from '@/lib/risk/types';

// Puerto de los elementos de TF-U-FRONTEND/components/views/risk-view.tsx.
// El donut de recharts se dibuja con react-native-svg; la tabla web pasa a
// tarjetas y el hover/tooltip a badges y chips.

export function RiskDonut({
  datos,
  size = 220,
  grosor = 28,
}: {
  datos: { nivel: string; valor: number; color: string }[];
  size?: number;
  grosor?: number;
}) {
  const { colores } = useTema();
  const radio = (size - grosor) / 2;
  const circunferencia = 2 * Math.PI * radio;
  const total = datos.reduce((suma, d) => suma + d.valor, 0);
  let acumulado = 0;

  return (
    <Svg width={size} height={size}>
      <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radio}
          stroke={colores.borde}
          strokeWidth={grosor}
          fill="none"
        />
        {total > 0 &&
          datos.map((d) => {
            if (d.valor <= 0) return null;
            const largo = (d.valor / total) * circunferencia;
            const offset = acumulado;
            acumulado += largo;
            return (
              <Circle
                key={d.nivel}
                cx={size / 2}
                cy={size / 2}
                r={radio}
                stroke={d.color}
                strokeWidth={grosor}
                fill="none"
                strokeDasharray={[largo, circunferencia - largo]}
                strokeDashoffset={-offset}
              />
            );
          })}
      </G>
    </Svg>
  );
}

export function NivelBadge({ nivel }: { nivel: Nivel }) {
  const meta = NIVEL_META[nivel] ?? NIVEL_META.nulo;
  return (
    <View style={{ backgroundColor: meta.fondo }} className="rounded-md px-2 py-0.5">
      <Text style={{ fontFamily: FUENTE.medium, fontSize: 11, color: meta.texto }}>
        {nivel}
      </Text>
    </View>
  );
}

export function TextoResaltado({
  texto,
  triggers,
  style,
}: {
  texto: string;
  triggers: string[];
  style?: object;
}) {
  const { colores } = useTema();
  const segmentos = segmentosResaltados(texto, triggers);
  return (
    <Text
      style={
        style ?? { fontFamily: FUENTE.regular, fontSize: 14, lineHeight: 21, color: colores.texto }
      }
    >
      {segmentos.map((s, i) =>
        s.resaltado ? (
          <Text key={i} style={{ backgroundColor: colores.errorFondo, color: colores.error }}>
            {s.texto}
          </Text>
        ) : (
          <Text key={i}>{s.texto}</Text>
        ),
      )}
    </Text>
  );
}

export function EvidenciaResaltada({
  texto,
  triggers,
}: {
  texto: string;
  triggers: string[];
}) {
  const [expandido, setExpandido] = useState(false);
  const MAX = 275;
  const esLargo = texto.length > MAX;
  const visible = expandido || !esLargo ? texto : `${texto.slice(0, MAX)} ...`;

  return (
    <View className="min-w-0">
      <TextoResaltado texto={visible} triggers={triggers} />

      {triggers.length > 0 && (
        <View className="mt-1 flex-row flex-wrap gap-1">
          {triggers.map((t) => (
            <View key={t} className="rounded border border-slate-300 dark:border-slate-700 px-1.5 py-0.5">
              <Text className="text-[10px] text-slate-600 dark:text-slate-400">{t}</Text>
            </View>
          ))}
        </View>
      )}

      {esLargo && (
        <TouchableOpacity onPress={() => setExpandido((v) => !v)} className="mt-1">
          <Text
            className="text-xs text-primario dark:text-primario-400"
            style={{ fontFamily: FUENTE.semibold }}
          >
            {expandido ? 'Ver menos' : 'Ver más'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
