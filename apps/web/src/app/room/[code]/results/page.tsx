'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Flame, Megaphone, Repeat, Rocket, Sparkles, Trophy, Zap } from 'lucide-react';
import { api } from '@/lib/api';

type ResultData = {
  gameName: string;
  code: string;
  finishedAt: string;
  durationMs: number;
  totalRounds: number;
  winnerAlias: string | null;
  summary: {
    ranking?: Array<{ alias: string; score: number; position: number }>;
  };
  highlights: Array<{ type: string; alias: string; roundIndex: number | null }>;
};

const HIGHLIGHTS: Record<string, { label: string; Icon: typeof Zap; className: string }> = {
  FASTEST_ANSWER: { label: 'Respuesta más rápida', Icon: Zap, className: 'text-amber-500' },
  LEADER_CHANGE: { label: 'Cambio de líder', Icon: Repeat, className: 'text-sky-500' },
  BEST_STREAK: { label: 'Mayor racha', Icon: Flame, className: 'text-orange-500' },
  FIRST_LINE: { label: 'Primera línea', Icon: Megaphone, className: 'text-brand-500' },
  BINGO: { label: 'Bingo', Icon: Trophy, className: 'text-amber-500' },
  BIGGEST_COMEBACK: { label: 'Mayor remontada', Icon: Rocket, className: 'text-emerald-500' },
};

export default function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const { data, isLoading, error } = useQuery({
    queryKey: ['result', code],
    queryFn: () => api<ResultData>(`/rooms/${code}/result`),
    retry: false,
  });

  if (isLoading) {
    return (
      <main className="mx-auto max-w-lg px-6 py-10">
        <div className="card h-60 animate-pulse" />
      </main>
    );
  }
  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-slate-500">Esta sala aún no tiene resultados.</p>
        <Link href="/" className="btn-secondary">
          Inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-6 px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-black">{data.gameName}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Sala {data.code} · {new Date(data.finishedAt).toLocaleString('es-ES')} ·{' '}
          {Math.round(data.durationMs / 60000)} min · {data.totalRounds} rondas
        </p>
        {data.winnerAlias && (
          <p className="mt-3 flex items-center justify-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-amber-500" aria-hidden />
            Ganador: <span className="font-bold">{data.winnerAlias}</span>
          </p>
        )}
      </header>

      {data.summary.ranking && (
        <section className="card p-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Clasificación
          </h2>
          <ol className="flex flex-col gap-1">
            {data.summary.ranking.map((r) => (
              <li
                key={r.position}
                className="flex justify-between rounded-lg bg-slate-100/60 px-3 py-2 text-sm dark:bg-slate-800/60"
              >
                <span>
                  {r.position}. {r.alias}
                </span>
                <span className="font-mono font-semibold tabular-nums">{r.score}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {data.highlights.length > 0 && (
        <section className="card p-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <Sparkles className="h-4 w-4" aria-hidden />
            Momentazos
          </h2>
          <ul className="flex flex-col gap-1 text-sm">
            {data.highlights.map((h, i) => {
              const cfg = HIGHLIGHTS[h.type];
              return (
                <li key={i} className="flex justify-between">
                  <span className="flex items-center gap-2">
                    {cfg && <cfg.Icon className={`h-4 w-4 ${cfg.className}`} aria-hidden />}
                    {cfg?.label ?? h.type}
                  </span>
                  <span className="font-semibold">{h.alias}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <Link href="/" className="btn-secondary self-center">
        Volver al inicio
      </Link>
    </main>
  );
}
