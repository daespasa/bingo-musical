'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import type { CollectionDetail, GameDetail } from '@/lib/types';
import { TrackList } from '@/components/track-list';

export default function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id],
    queryFn: () => api<GameDetail>(`/games/${id}`),
  });

  const { data: collection } = useQuery({
    queryKey: ['collection', game?.collection.id],
    queryFn: () => api<CollectionDetail>(`/collections/${game!.collection.id}`),
    enabled: Boolean(game),
  });

  const openRoom = useMutation({
    mutationFn: (mode: 'PROJECTOR' | 'REMOTE') =>
      api<{ code: string }>('/rooms', {
        method: 'POST',
        body: JSON.stringify({ gameId: id, mode }),
      }),
    onSuccess: (room) => router.push(`/room/${room.code}/host`),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo abrir la sala'),
  });

  const duplicate = useMutation({
    mutationFn: () => api<{ id: string }>(`/games/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (g) => {
      void queryClient.invalidateQueries({ queryKey: ['games'] });
      router.push(`/dashboard/games/${g.id}`);
    },
  });

  if (isLoading) return <div className="card h-60 animate-pulse" />;
  if (!game) return <p className="text-slate-500">Partida no encontrada.</p>;

  const activeRoom = game.rooms.find((r) =>
    ['LOBBY', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'ROUND_RESULTS'].includes(r.status),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{game.name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {game.collection.name} · {game.collection.trackCount} canciones · Cartón{' '}
            {game.settings?.cardSize}×{game.settings?.cardSize} ·{' '}
            {(game.settings?.snippetDurationMs ?? 15000) / 1000}s por ronda
          </p>
        </div>
        <button
          onClick={() => duplicate.mutate()}
          disabled={duplicate.isPending}
          className="btn-secondary"
        >
          Duplicar
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-accent-500">
          {error}
        </p>
      )}

      {activeRoom ? (
        <div className="card flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <p className="font-semibold">Sala activa</p>
            <p className="text-3xl font-black tracking-widest text-brand-600 dark:text-brand-400">
              {activeRoom.code}
            </p>
          </div>
          <Link href={`/room/${activeRoom.code}/host`} className="btn-primary">
            Ir al panel del anfitrión
          </Link>
        </div>
      ) : (
        <div className="card flex flex-col gap-4 p-6 sm:flex-row">
          <button
            onClick={() => openRoom.mutate('REMOTE')}
            disabled={openRoom.isPending}
            className="btn-primary flex-1"
          >
            📱 Abrir sala (modo remoto)
          </button>
          <button
            onClick={() => openRoom.mutate('PROJECTOR')}
            disabled={openRoom.isPending}
            className="btn-secondary flex-1"
          >
            📽️ Abrir sala (modo proyector)
          </button>
        </div>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Canciones</h2>
        {collection ? (
          <TrackList tracks={collection.tracks} />
        ) : (
          <div className="card h-40 animate-pulse" />
        )}
      </section>
    </div>
  );
}
