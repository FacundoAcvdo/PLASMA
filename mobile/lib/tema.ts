export type Colores = {
  fondo: string;
  fondoAlt: string;
  superficie: string;
  superficieAlt: string;
  borde: string;
  bordeSuave: string;
  texto: string;
  textoMedio: string;
  textoSuave: string;
  textoMuted: string;
  primario: string;
  primarioFuerte: string;
  primarioFondo: string;
  sobrePrimario: string;
  exito: string;
  exitoFondo: string;
  exitoBorde: string;
  error: string;
  errorFondo: string;
  errorBorde: string;
  advertencia: string;
  advertenciaFondo: string;
  advertenciaBorde: string;
  info: string;
  overlay: string;
  sombra: string;
  esqueleto: string;
  codigoFondo: string;
  codigoBloqueFondo: string;
};

export const PALETA: { claro: Colores; oscuro: Colores } = {
  claro: {
    fondo: '#ffffff',
    fondoAlt: '#f8fafc',
    superficie: '#ffffff',
    superficieAlt: '#f1f5f9',
    borde: '#e2e8f0',
    bordeSuave: '#f1f5f9',
    texto: '#0f172a',
    textoMedio: '#334155',
    textoSuave: '#64748b',
    textoMuted: '#94a3b8',
    primario: '#1447e6',
    primarioFuerte: '#193cb8',
    primarioFondo: '#eff6ff',
    sobrePrimario: '#ffffff',
    exito: '#047857',
    exitoFondo: '#ecfdf5',
    exitoBorde: '#a7f3d0',
    error: '#b91c1c',
    errorFondo: '#fef2f2',
    errorBorde: '#fecaca',
    advertencia: '#b45309',
    advertenciaFondo: '#fffbeb',
    advertenciaBorde: '#fde68a',
    info: '#2563eb',
    overlay: 'rgba(2, 6, 23, 0.5)',
    sombra: '#0f172a',
    esqueleto: '#e2e8f0',
    codigoFondo: 'rgba(15, 23, 42, 0.08)',
    codigoBloqueFondo: 'rgba(15, 23, 42, 0.06)',
  },
  oscuro: {
    fondo: '#020617',
    fondoAlt: '#0f172a',
    superficie: '#0f172a',
    superficieAlt: '#1e293b',
    borde: '#1e293b',
    bordeSuave: '#1e293b',
    texto: '#f1f5f9',
    textoMedio: '#cbd5e1',
    textoSuave: '#94a3b8',
    textoMuted: '#64748b',
    primario: '#2b7fff',
    primarioFuerte: '#8ec5ff',
    primarioFondo: '#162456',
    sobrePrimario: '#ffffff',
    exito: '#6ee7b7',
    exitoFondo: '#022c22',
    exitoBorde: '#065f46',
    error: '#fca5a5',
    errorFondo: '#450a0a',
    errorBorde: '#7f1d1d',
    advertencia: '#fcd34d',
    advertenciaFondo: '#451a03',
    advertenciaBorde: '#78350f',
    info: '#93c5fd',
    overlay: 'rgba(0, 0, 0, 0.7)',
    sombra: '#000000',
    esqueleto: '#1e293b',
    codigoFondo: 'rgba(148, 163, 184, 0.16)',
    codigoBloqueFondo: 'rgba(148, 163, 184, 0.12)',
  },
};
