'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { API_URL, setUnauthorizedHandler } from '@/lib/api';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
      }),
  );
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let checking = false;

    setUnauthorizedHandler(() => {
      // Solo afecta a las pantallas de quien tiene cuenta: en una sala, quien
      // juega de invitado tiene su propio aviso y no debe acabar en el acceso.
      if (!pathname.startsWith('/dashboard')) return;
      if (checking) return;
      checking = true;

      /*
       * Se confirma antes de echar a nadie. Un 401 suelto puede ser una
       * carrera al recién entrar (la petición sale antes de que el navegador
       * guarde la cookie), y expulsar por eso es peor que el problema que se
       * arregla. Solo si la comprobación también falla se da la sesión por
       * perdida.
       */
      void fetch(`${API_URL}/auth/me`, { credentials: 'include' })
        .then((res) => {
          if (res.ok) return;
          client.clear();
          router.replace('/login?caducada=1');
        })
        .catch(() => {
          // Sin red no se echa a nadie: ya hay una página para eso
        })
        .finally(() => {
          checking = false;
        });
    });
    return () => setUnauthorizedHandler(null);
  }, [client, pathname, router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
