'use client';

import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { api, type PublicUser } from '@/lib/api';

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
    <div className="flex items-center gap-3">
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
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )
      )}
      <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
        {user?.displayName}
      </span>
      <button
        onClick={logout}
        className="btn-secondary min-h-9 w-auto px-3 py-2 text-xs"
        aria-label="Cerrar sesión"
      >
        <LogOut className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden lg:inline">Cerrar sesión</span>
      </button>
    </div>
  );
}
