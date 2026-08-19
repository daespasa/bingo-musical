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
 * Comparte la clave `['me']` con `UserMenu`: llegar a una sala desde el panel
 * por navegación de cliente reutiliza esa caché y no hay petición nueva.
 *
 * `/auth/me` responde 401 sin sesión, y eso llega como error de la consulta, no
 * como `data: null`. Solo el 401 significa invitado: cualquier otro fallo (red,
 * 500) se queda en `cargando`, porque expulsar a alguien de su panel por un
 * corte de red es peor que un botón deshabilitado.
 *
 * El 401 no se reintenta (no lo va a arreglar un reintento). Los demás fallos
 * sí, hasta 3 veces: con `retry: false` a secas, un fallo transitorio de red
 * dejaba el estado en `cargando` para siempre mientras el componente siguiera
 * montado, sin que `refetchOnWindowFocus` (desactivado globalmente) lo
 * reintentase nunca.
 */
export function useIsAuthenticated(): AuthState {
  const { data, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<PublicUser>('/auth/me'),
    retry: (count, error) => !(error instanceof ApiError && error.status === 401) && count < 3,
  });

  if (error) {
    return error instanceof ApiError && error.status === 401 ? 'invitado' : 'cargando';
  }
  return data ? 'autenticado' : 'cargando';
}
