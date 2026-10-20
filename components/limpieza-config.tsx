import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, Hash, Languages, Smile } from 'lucide-react-native';
import { Selector } from '@/components/Selector';
import { toast } from '@/lib/toast';
import type {
  CleaningConfig,
  CleaningLanguage,
  CleaningOperation,
} from '@/lib/limpieza/types';

// Espejo de TF-U-FRONTEND/lib/data-cleaning/cleaning-config.tsx.
// Mismas operaciones, mismos textos y misma lógica (conflicto lemm/truncado,
// idioma dependiente). Estética adaptada de web (grid) a móvil (columna).

interface LimpiezaConfigProps {
  config: CleaningConfig;
  onChange: (config: CleaningConfig) => void;
}

interface OperationOption {
  value: CleaningOperation;
  label: string;
  description: string;
}

// Operaciones que requieren que el usuario indique un idioma.
const LANGUAGE_DEPENDENT_OPERATIONS: CleaningOperation[] = ['lemmatization', 'truncation'];

// Lematización y truncado normalizan palabras con métodos distintos e
// incompatibles entre sí: por eso son mutuamente excluyentes.
const MUTUALLY_EXCLUSIVE_OPERATIONS: Partial<Record<CleaningOperation, CleaningOperation>> = {
  lemmatization: 'truncation',
  truncation: 'lemmatization',
};

const OPERATION_LABELS: Partial<Record<CleaningOperation, string>> = {
  lemmatization: 'Lematización',
  truncation: 'Truncado',
};

const OPERATIONS: OperationOption[] = [
  {
    value: 'lowercase',
    label: 'Convertir a minúsculas',
    description: 'Convierte todo el texto a minúsculas.',
  },
  {
    value: 'remove_urls',
    label: 'Eliminar URLs',
    description: 'Elimina enlaces y direcciones web.',
  },
  {
    value: 'remove_mentions',
    label: 'Eliminar menciones',
    description: 'Elimina menciones como @usuario.',
  },
  {
    value: 'normalize_whitespace',
    label: 'Normalizar espacios',
    description: 'Reduce espacios y saltos de línea innecesarios.',
  },
  {
    value: 'remove_duplicates',
    label: 'Eliminar duplicados',
    description: 'Elimina documentos con texto repetido.',
  },
  {
    value: 'remove_punctuation',
    label: 'Eliminar puntuación',
    description: 'Elimina signos de puntuación.',
  },
  {
    value: 'remove_stopwords',
    label: 'Eliminar stopwords',
    description: 'Elimina palabras frecuentes en inglés y español.',
  },
  {
    value: 'lemmatization',
    label: 'Lematización',
    description:
      'Convierte las palabras a su forma léxica base. No se puede combinar con Truncado.',
  },
  {
    value: 'truncation',
    label: 'Truncado',
    description:
      'Reduce las palabras a su raíz (stemming). No se puede combinar con Lematización.',
  },
  {
    value: 'anonymization',
    label: 'Anonimización',
    description: 'Reemplaza emails, teléfonos e IPs.',
  },
];

const EMOJI_OPTIONS: {
  value: CleaningConfig['emoji_strategy'];
  label: string;
  description: string;
}[] = [
  { value: 'keep', label: 'Conservar', description: 'Mantiene los emojis originales.' },
  { value: 'remove', label: 'Eliminar', description: 'Elimina los emojis del texto.' },
  { value: 'convert', label: 'Convertir', description: 'Convierte emojis a nombres textuales.' },
];

const HASHTAG_OPTIONS: {
  value: CleaningConfig['hashtag_strategy'];
  label: string;
  description: string;
}[] = [
  { value: 'keep', label: 'Conservar', description: 'Mantiene el hashtag completo.' },
  { value: 'remove_symbol', label: 'Quitar #', description: 'Conserva la palabra y elimina el símbolo #.' },
  { value: 'segment', label: 'Segmentar', description: 'Intenta separar palabras dentro del hashtag.' },
];

const LANGUAGE_OPTIONS: { value: CleaningLanguage; label: string; description: string }[] = [
  { value: 'bilingual', label: 'Bilingüe', description: 'Preparado para datasets bilingües.' },
  { value: 'en', label: 'Inglés', description: 'Usa el modelo lingüístico de inglés.' },
  { value: 'es', label: 'Español', description: 'Usa el modelo lingüístico de español.' },
];

function Tarjeta({
  titulo,
  descripcion,
  icono,
  children,
}: {
  titulo: string;
  descripcion?: string;
  icono?: ReactNode;
  children: ReactNode;
}) {
  return (
    <View className="rounded-xl border border-slate-200 bg-white p-4">
      <View className="mb-3">
        <View className="flex-row items-center gap-2">
          {icono}
          <Text style={{ fontFamily: 'Inter_600SemiBold', fontSize: 15, color: '#0f172a' }}>
            {titulo}
          </Text>
        </View>
        {descripcion ? (
          <Text className="mt-1 text-xs leading-relaxed text-slate-500">{descripcion}</Text>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Casilla({ activa }: { activa: boolean }) {
  return (
    <View
      className={`mt-0.5 size-5 items-center justify-center rounded border ${
        activa ? 'border-indigo-600 bg-indigo-600' : 'border-slate-300 bg-white'
      }`}
    >
      {activa ? <Check size={13} color="#fff" /> : null}
    </View>
  );
}

function TarjetaOperacion({
  seleccionada,
  etiqueta,
  descripcion,
  icono,
  onPress,
}: {
  seleccionada: boolean;
  etiqueta: string;
  descripcion: string;
  icono?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-start gap-3 rounded-xl border p-4 ${
        seleccionada ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'
      }`}
    >
      <Casilla activa={seleccionada} />
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-2">
          {icono}
          <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-sm text-slate-900">
            {etiqueta}
          </Text>
          {seleccionada ? <Check size={16} color="#4f46e5" /> : null}
        </View>
        <Text className="mt-1 text-xs leading-relaxed text-slate-500">{descripcion}</Text>
      </View>
    </Pressable>
  );
}

function TarjetaOpcion({
  seleccionada,
  etiqueta,
  descripcion,
  onPress,
}: {
  seleccionada: boolean;
  etiqueta: string;
  descripcion: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-xl border p-3 ${
        seleccionada ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 bg-white'
      }`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-sm text-slate-900">
          {etiqueta}
        </Text>
        {seleccionada ? <Check size={16} color="#4f46e5" /> : null}
      </View>
      <Text className="mt-1 text-xs leading-relaxed text-slate-500">{descripcion}</Text>
    </Pressable>
  );
}

export function LimpiezaConfig({ config, onChange }: LimpiezaConfigProps) {
  const hasEmojis = config.operations.includes('handle_emojis');
  const hasHashtags = config.operations.includes('handle_hashtags');

  const hasLanguageDependentOperation = config.operations.some((operation) =>
    LANGUAGE_DEPENDENT_OPERATIONS.includes(operation),
  );

  const toggleOperation = (operation: CleaningOperation) => {
    const exists = config.operations.includes(operation);

    let operations = exists
      ? config.operations.filter((item) => item !== operation)
      : [...config.operations, operation];

    // Swap automático: al activar una operación en conflicto se desactiva la otra.
    if (!exists) {
      const conflict = MUTUALLY_EXCLUSIVE_OPERATIONS[operation];
      if (conflict && operations.includes(conflict)) {
        operations = operations.filter((item) => item !== conflict);
        toast.info(
          `Se desactivó "${OPERATION_LABELS[conflict]}": no se puede combinar con "${OPERATION_LABELS[operation]}".`,
        );
      }
    }

    const nextConfig: CleaningConfig = { ...config, operations };

    const stillNeedsLanguage = operations.some((item) =>
      LANGUAGE_DEPENDENT_OPERATIONS.includes(item),
    );

    if (!stillNeedsLanguage) {
      nextConfig.language = null;
    } else if (!config.language) {
      nextConfig.language = 'bilingual';
    }

    onChange(nextConfig);
  };

  return (
    <View className="gap-4">
      <Tarjeta
        titulo="Operaciones de limpieza"
        descripcion={
          'Selecciona las transformaciones que quieres aplicar al dataset. Las operaciones se ' +
          'ejecutarán en el orden definido por el backend. Lematización y truncado son técnicas ' +
          'alternativas para normalizar palabras, por lo que no pueden aplicarse juntas.'
        }
      >
        <View className="gap-3">
          {OPERATIONS.map((operation) => (
            <TarjetaOperacion
              key={operation.value}
              seleccionada={config.operations.includes(operation.value)}
              etiqueta={operation.label}
              descripcion={operation.description}
              onPress={() => toggleOperation(operation.value)}
            />
          ))}

          <TarjetaOperacion
            seleccionada={hasEmojis}
            etiqueta="Gestionar emojis"
            descripcion="Define qué hacer con los emojis del texto."
            icono={<Smile size={16} color="#64748b" />}
            onPress={() => toggleOperation('handle_emojis')}
          />

          <TarjetaOperacion
            seleccionada={hasHashtags}
            etiqueta="Gestionar hashtags"
            descripcion="Define cómo tratar hashtags como #depresion."
            icono={<Hash size={16} color="#64748b" />}
            onPress={() => toggleOperation('handle_hashtags')}
          />
        </View>
      </Tarjeta>

      {hasEmojis && (
        <Tarjeta
          titulo="Tratamiento de emojis"
          icono={<Smile size={18} color="#0f172a" />}
          descripcion="Los emojis pueden contener información emocional relevante, por lo que su eliminación es opcional."
        >
          <View className="gap-3">
            {EMOJI_OPTIONS.map((option) => (
              <TarjetaOpcion
                key={option.value}
                seleccionada={config.emoji_strategy === option.value}
                etiqueta={option.label}
                descripcion={option.description}
                onPress={() => onChange({ ...config, emoji_strategy: option.value })}
              />
            ))}
          </View>
        </Tarjeta>
      )}

      {hasHashtags && (
        <Tarjeta
          titulo="Tratamiento de hashtags"
          icono={<Hash size={18} color="#0f172a" />}
          descripcion="Los hashtags pueden conservar información temática útil para el análisis."
        >
          <View className="gap-3">
            {HASHTAG_OPTIONS.map((option) => (
              <TarjetaOpcion
                key={option.value}
                seleccionada={config.hashtag_strategy === option.value}
                etiqueta={option.label}
                descripcion={option.description}
                onPress={() => onChange({ ...config, hashtag_strategy: option.value })}
              />
            ))}
          </View>
        </Tarjeta>
      )}

      {hasLanguageDependentOperation && (
        <Tarjeta
          titulo="Idioma para lematización / truncado"
          icono={<Languages size={18} color="#0f172a" />}
          descripcion="La lematización y el truncado necesitan conocer el idioma del dataset."
        >
          <Selector
            etiqueta="Idioma"
            valor={config.language ?? 'bilingual'}
            opciones={LANGUAGE_OPTIONS.map((o) => ({
              valor: o.value,
              etiqueta: o.label,
              detalle: o.description,
            }))}
            onCambiar={(value) => onChange({ ...config, language: value as CleaningLanguage })}
          />
        </Tarjeta>
      )}
    </View>
  );
}
