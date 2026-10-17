// IP LAN del server en red local (o 10.0.2.2 para emulador Android).
// Se puede pisar en build con EXPO_PUBLIC_API_BASE.
export const API_BASE: string =
  process.env.EXPO_PUBLIC_API_BASE ?? 'http://10.0.2.2:7500';

export const APP_NAME = 'PLASMA';
