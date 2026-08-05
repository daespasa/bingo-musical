'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicUser } from '@/lib/api';

export function UserMenu() {
  const router = useRouter();
  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<PublicUser>('/auth/me'),
  });

  const logout = async () => {
    await api('/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-500 dark:text-slate-400 sm:inline">
        {user?.displayName}
      </span>
      <button onClick={logout} className="btn-secondary px-3 py-2 text-xs">
        Cerrar sesión
      </button>
    </div>
  );
}
