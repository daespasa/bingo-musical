'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError, api, type PublicUser } from '@/lib/api';

/**
 * Estado de sesión en tres valores en lugar de un booleano: quien decide un
 * destino con esto no debe apuntar a ningún sitio mientras la consulta está en
 * vuelo, o el enlace cambia bajo el dedo.
 */
export type AuthState = 'autenticado' | 'invitado' | 'cargando';

/**
 * Comparte la clave `['me']` con `UserMenu`, así que en las pantallas con menú
 * el dato suele venir de caché y no hay petición nueva.
 *
 * `/auth/me` responde 401 sin sesión, y eso llega como error de la consulta, no
 * como `data: null`. Solo el 401 significa invitado: cualquier otro fallo (red,
 * 500) se queda en `cargando`, porque expulsar a alguien de su panel por un
 * corte de red es peor que un botón deshabilitado.
 */
export function useIsAuthenticated(): AuthState {
  const { data, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<PublicUser>('/auth/me'),
    retry: false,
  });

  if (error) {
    return error instanceof ApiError && error.status === 401 ? 'invitado' : 'cargando';
  }
  return data ? 'autenticado' : 'cargando';
}
