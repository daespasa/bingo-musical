export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Aviso de sesión caída. La cookie puede seguir en el navegador pero ya no
 * valer (ha caducado, o se ha cerrado desde otro dispositivo), y entonces la
 * aplicación se queda dando errores sin echar a nadie. Quien monte la
 * aplicación decide qué hacer; aquí solo se avisa.
 */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) {
    let message = `Error ${res.status}`;
    try {
      const data = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(data.message) ? data.message.join(', ') : (data.message ?? message);
    } catch {
      // sin cuerpo JSON
    }
    if (res.status === 401) onUnauthorized?.();
    throw new ApiError(res.status, message);
  }
  // Las operaciones que no devuelven nada responden 204 sin cuerpo, y pedirle
  // JSON a un cuerpo vacío revienta.
  if (res.status === 204 || res.headers.get('content-length') === '0') {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export type PublicUser = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  hasPassword: boolean;
  linkedGoogle: boolean;
};

export type AuthProviders = { password: boolean; google: boolean };
