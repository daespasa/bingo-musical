'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Pause } from 'lucide-react';
import clsx from 'clsx';
import type {
  RoundPreparePayload,
  RoundRevealedPayload,
  RoundSchedulePayload,
} from '@bingo/shared';

export function RoundStatus({
  schedule,
  prepare,
  revealed,
  paused,
  playing,
  audioError,
}: {
  schedule: RoundSchedulePayload | null;
  prepare: RoundPreparePayload | null;
  revealed: RoundRevealedPayload | null;
  paused: boolean;
  playing: boolean;
  audioError: string | null;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(i);
  }, []);

  const roundLabel =
    prepare != null ? `Ronda ${prepare.index + 1} de ${prepare.totalRounds}` : 'Ronda';

  let body: React.ReactNode;
  let progress: number | null = null;

  if (paused) {
    body = (
      <p className="flex items-center gap-2 font-display text-lg">
        <Pause className="h-5 w-5" aria-hidden />
        Partida en pausa
      </p>
    );
  } else if (revealed) {
    body = (
      <div className="animate-rise">
        <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          La canción era…
        </p>
        <p className="font-display text-xl leading-tight">{revealed.title}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">{revealed.artist}</p>
      </div>
    );
  } else if (schedule) {
    const elapsed = now - schedule.serverTimestamp;
    const untilStart = schedule.startsAt - schedule.serverTimestamp - elapsed;
    const untilEnd = schedule.endsAt - schedule.serverTimestamp - elapsed;
    if (untilStart > 0) {
      body = (
        <p className="font-display text-lg">
          Empieza en{' '}
          <span className="data text-brand-600 dark:text-brand-400">
            {Math.max(1, Math.ceil(untilStart / 1000))}
          </span>
          …
        </p>
      );
    } else if (untilEnd > 0) {
      progress = 1 - untilEnd / schedule.durationMs;
      body = (
        <div>
          <p className="font-display text-lg leading-tight">
            {playing ? '¡Suena la canción!' : 'Escucha…'}
          </p>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            ¿La tienes en el cartón?
          </p>
        </div>
      );
    } else {
      body = (
        <p className="font-display text-lg leading-tight text-brand-600 dark:text-brand-400">
          Últimos segundos para marcar…
        </p>
      );
    }
  } else {
    body = (
      <p className="font-display text-lg leading-tight text-slate-500 dark:text-slate-400">
        Preparando la siguiente canción…
      </p>
    );
  }

  return (
    <div className="card p-4">
      <p className="eyebrow mb-3">{roundLabel}</p>

      <div className="flex items-center gap-4">
        {/*
         * El disco gira solo mientras suena el fragmento: al pararse indica que
         * la ventana para marcar se ha cerrado, sin necesidad de leer nada.
         */}
        <div
          className={clsx('vinyl w-14 shrink-0', playing && !paused && 'animate-spin-record')}
          aria-hidden
        />
        <div className="min-w-0 flex-1">{body}</div>
      </div>

      {progress !== null && (
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full border border-slate-900 bg-slate-200 dark:border-slate-700 dark:bg-slate-800"
          role="progressbar"
          aria-valuenow={Math.round(progress * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso del fragmento"
        >
          <div
            className="h-full bg-brand-600 transition-[width] duration-200"
            style={{ width: `${Math.min(100, progress * 100)}%` }}
          />
        </div>
      )}

      {audioError && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-rose-500">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {audioError}
        </p>
      )}
    </div>
  );
}
