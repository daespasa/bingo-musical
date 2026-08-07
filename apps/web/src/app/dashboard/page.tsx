'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Library, Mic2, Play, Plus, Trophy } from 'lucide-react';
import { api, type PublicUser } from '@/lib/api';

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
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api<PublicUser>('/auth/me') });
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api<Array<{ id: string; trackCount: number }>>('/collections'),
  });
  const { data: history } = useQuery({
    queryKey: ['history'],
    queryFn: () => api<unknown[]>('/games/history'),
  });

  const visible = games?.filter((g) => g.status !== 'ARCHIVED') ?? [];
  const live = visible.find((g) => g.activeRoomCode);
  const songs = (collections ?? []).reduce((total, c) => total + c.trackCount, 0);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2">Hola{user ? `, ${user.displayName}` : ''}</p>
          <h1 className="font-display text-3xl leading-tight sm:text-4xl">
            ¿Montamos una partida?
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Elige la música, comparte el código y a jugar.
          </p>
        </div>
        <Link href="/dashboard/games/new" className="btn-primary sm:w-auto">
          <Plus className="h-4 w-4" aria-hidden />
          Nueva partida
        </Link>
      </div>

      {/* Sala en marcha: lo primero que necesitas si dejaste una abierta */}
      {live?.activeRoomCode && (
        <Link
          href={`/room/${live.activeRoomCode}/host`}
          className="card animate-toast mb-6 flex items-center gap-3 p-4 hover:border-brand-600"
        >
          <Play className="h-5 w-5 shrink-0 text-brand-600" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block font-display">Tienes una sala abierta</span>
            <span className="block truncate text-sm text-slate-600 dark:text-slate-300">
              {live.name} · código <span className="data">{live.activeRoomCode}</span>
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-brand-600">
            Volver
          </span>
        </Link>
      )}

      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <div className="card p-4">
          <p className="eyebrow mb-1">Partidas listas</p>
          <p className="data text-2xl">{visible.length}</p>
        </div>
        <Link href="/dashboard/music" className="card p-4 hover:border-brand-600">
          <p className="eyebrow mb-1">Canciones</p>
          <p className="data flex items-center gap-2 text-2xl">
            <Library className="h-5 w-5 text-slate-400" aria-hidden />
            {songs}
          </p>
        </Link>
        <Link href="/dashboard/history" className="card p-4 hover:border-brand-600">
          <p className="eyebrow mb-1">Ya jugadas</p>
          <p className="data flex items-center gap-2 text-2xl">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
            {history?.length ?? 0}
          </p>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="card h-32 animate-pulse" />
          ))}
        </div>
      )}

      {games && visible.length === 0 && (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <Mic2 className="h-10 w-10 text-brand-400" aria-hidden />
          <p className="text-slate-500 dark:text-slate-400">
            Todavía no tienes partidas. ¡Crea la primera y monta la fiesta!
          </p>
          <Link href="/dashboard/games/new" className="btn-primary sm:w-auto">
            Crear partida
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((game) => (
          <Link
            key={game.id}
            href={`/dashboard/games/${game.id}`}
            className="card group block p-5 transition hover:-translate-y-1 hover:border-brand-300 hover:shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-black tracking-tight group-hover:text-brand-700 dark:group-hover:text-brand-300">
                {game.name}
              </h2>
              <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-medium text-brand-700 dark:bg-brand-900 dark:text-brand-300">
                {game.status === 'READY' ? 'Lista' : 'Borrador'}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{game.collectionName}</p>
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
