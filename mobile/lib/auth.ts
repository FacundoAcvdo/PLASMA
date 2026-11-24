import { apiFetch } from './api-fetch';
import { getToken, setToken } from './api-fetch';

export type SessionUser = {
  id: string;
  email: string;
  role?: string;
  terms_accepted?: boolean;
  terms_accepted_at?: string | null;
};

type LoginResponse = {
  user?: SessionUser;
  access_token?: string;
  expires_in?: number;
};

export async function login(email: string, password: string): Promise<SessionUser> {
  const data = await apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!data?.user || !data?.access_token) {
    throw new Error('Respuesta de login inválida.');
  }
  await setToken(data.access_token);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST' }, { silent: true });
  } catch {
    // igual se limpia la sesión local
  }
  await setToken(null);
}

export async function me(): Promise<SessionUser | null> {
  try {
    const data = await apiFetch<{ user?: SessionUser }>(
      '/auth/me',
      { method: 'GET' },
      { silent: true },
    );
    return data?.user ?? null;
  } catch {
    return null;
  }
}

export async function acceptTerms(): Promise<SessionUser | null> {
  const data = await apiFetch<{ user?: SessionUser }>(
    '/auth/terms/accept',
    { method: 'POST' },
  );
  return data?.user ?? null;
}

export { getToken };
