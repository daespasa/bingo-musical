'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

type GameSummary = {
  id: string;
  name: string;
  status: 'DRAFT' | 'READY' | 'ARCHIVED';
  createdAt: string;
  collectionName: string;
  activeRoomCode: string | null;
};

export default function DashboardPage() {
  const { data: games, isLoading } = useQuery({
    queryKey: ['games'],
    queryFn: () => api<GameSummary[]>('/games'),
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis partidas</h1>
        <Link href="/dashboard/games/new" className="btn-primary">
          ＋ Nueva partida
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-32 animate-pulse" />
          ))}
        </div>
      )}

      {games && games.length === 0 && (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <p className="text-4xl" aria-hidden>
            🎤
          </p>
          <p className="text-slate-500 dark:text-slate-400">
            Todavía no tienes partidas. ¡Crea la primera y monta la fiesta!
          </p>
          <Link href="/dashboard/games/new" className="btn-primary">
            Crear partida
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {games
          ?.filter((g) => g.status !== 'ARCHIVED')
          .map((game) => (
            <Link
              key={game.id}
              href={`/dashboard/games/${game.id}`}
              className="card block p-6 hover:border-brand-400"
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold">{game.name}</h2>
                <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                  {game.status === 'READY' ? 'Lista' : 'Borrador'}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {game.collectionName}
              </p>
              {game.activeRoomCode && (
                <p className="mt-2 text-sm font-medium text-brand-600 dark:text-brand-400">
                  Sala activa: {game.activeRoomCode}
                </p>
              )}
            </Link>
          ))}
      </div>
    </div>
  );
}
