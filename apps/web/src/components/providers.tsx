'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { setUnauthorizedHandler } from '@/lib/api';

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
    setUnauthorizedHandler(() => {
      // Solo afecta a las pantallas de quien tiene cuenta: en una sala, quien
      // juega de invitado tiene su propio aviso y no debe acabar en el login.
      if (!pathname.startsWith('/dashboard')) return;
      client.clear();
      router.replace('/login?caducada=1');
    });
    return () => setUnauthorizedHandler(null);
  }, [client, pathname, router]);

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
