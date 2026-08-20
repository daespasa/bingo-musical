'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { api, type PublicUser } from '@/lib/api';
import { ThemeToggle } from '@/components/theme-toggle';

export function UserMenu() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<PublicUser>('/auth/me'),
  });

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    queryClient.clear();
    router.push('/login');
  };

  return (
    // `max-w` + `flex-wrap` por debajo de `lg`: la cabecera del panel (logo,
    // navegación, cuenta y «Cerrar sesión») ya va justa de sitio en esos
    // anchos, y el selector de tema añade un cuarto grupo que la hace
    // desbordar sobre la navegación. En vez de comprimir la navegación hasta
    // que se solape, la cuenta y «Cerrar sesión» conservan su fila de
    // siempre y el selector de tema cae a una segunda línea, alineado con
    // ellos. En `lg` la navegación ya muestra sus rótulos completos y hay
    // sitio de sobra: todo vuelve a una sola fila.
    <div className="flex max-w-[6.5rem] flex-wrap items-center justify-end gap-2 lg:max-w-none lg:flex-nowrap">
      <Link
        href="/dashboard/profile"
        className="flex items-center gap-2 rounded px-1 py-1 hover:text-brand-600"
        aria-label="Tu cuenta"
      >
        {user?.avatarUrl ? (
          // Avatar remoto de Google: <img> evita configurar dominios en next/image
          <img
            src={user.avatarUrl}
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-full border border-slate-200 dark:border-slate-700"
            referrerPolicy="no-referrer"
          />
        ) : (
          user && (
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-slate-900 bg-brand-600 font-display text-sm text-slate-50 dark:border-slate-100">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )
        )}
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:inline">
          {user?.displayName}
        </span>
      </Link>
      <button
        onClick={logout}
        className="btn-secondary min-h-9 w-auto px-3 py-2 text-xs"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden lg:inline">Cerrar sesión</span>
      </button>
      <ThemeToggle className="shrink-0" />
    </div>
  );
}
