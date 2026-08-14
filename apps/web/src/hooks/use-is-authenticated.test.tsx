import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { useIsAuthenticated } from './use-is-authenticated';

const api = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async () => {
  const real = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return { ...real, api };
});

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useIsAuthenticated', () => {
  beforeEach(() => {
    api.mockReset();
  });

  it('empieza en cargando mientras la consulta está en vuelo', () => {
    api.mockReturnValue(new Promise(() => {}));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    expect(result.current).toBe('cargando');
  });

  it('da autenticado cuando /auth/me responde', async () => {
    api.mockResolvedValue({ id: 'u1', displayName: 'Demo' });
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(result.current).toBe('autenticado'));
  });

  it('da invitado cuando /auth/me responde 401', async () => {
    api.mockRejectedValue(new ApiError(401, 'No autenticado'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(result.current).toBe('invitado'));
  });

  it('se queda en cargando ante un error de red: no expulsa a nadie', async () => {
    api.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(result.current).toBe('cargando');
  });

  it('trata un 500 como cargando, no como invitado', async () => {
    api.mockRejectedValue(new ApiError(500, 'Boom'));
    const { result } = renderHook(() => useIsAuthenticated(), { wrapper });
    await waitFor(() => expect(api).toHaveBeenCalled());
    expect(result.current).toBe('cargando');
  });
});
