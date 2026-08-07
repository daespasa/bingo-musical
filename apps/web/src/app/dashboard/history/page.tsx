'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';

type HistoryEntry = {
  roomId: string;
  gameName: string;
  /** Las partidas anteriores a Gramola llegan aquí ya como «Bingo musical». */
  modeName: string;
  variantName: string | null;
  code: string;
  finishedAt: string;
  durationMs: number;
  participants: number;
  winnerAlias: string | null;
};

export default function HistoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['history'],
    queryFn: () => api<HistoryEntry[]>('/games/history'),
  });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black tracking-tight sm:text-4xl">Historial</h1>
      {isLoading && <div className="card h-40 animate-pulse" />}
      {data && data.length === 0 && (
        <div className="card p-12 text-center text-slate-500 dark:text-slate-400">
          Aún no hay partidas terminadas.
        </div>
      )}
      {data && data.length > 0 && (
        <div className="card divide-y divide-slate-200 dark:divide-slate-800">
          {data.map((h) => (
            <div
              key={h.roomId}
              className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5"
            >
              <div>
                <p className="font-semibold">{h.gameName}</p>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  {h.modeName}
                  {h.variantName ? ` · ${h.variantName}` : ''}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sala {h.code} · {new Date(h.finishedAt).toLocaleString('es-ES')} ·{' '}
                  {Math.round(h.durationMs / 60000)} min · {h.participants} jugadores
                </p>
              </div>
              <div className="flex w-full items-center justify-between gap-3 text-sm sm:w-auto sm:justify-start">
                <span className="flex items-center gap-1.5">
                  <Trophy className="h-4 w-4 text-amber-500" aria-hidden />
                  <span className="font-medium">{h.winnerAlias ?? '—'}</span>
                </span>
                <Link
                  href={`/room/${h.code}/results`}
                  className="text-brand-600 hover:underline dark:text-brand-400"
                >
                  Ver resumen
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
