'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Clapperboard, Headphones, Music, Pause, Timer } from 'lucide-react';
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
  if (paused) {
    body = (
      <p className="flex items-center justify-center gap-2 text-lg font-semibold">
        <Pause className="h-5 w-5" aria-hidden />
        Partida en pausa
      </p>
    );
  } else if (revealed) {
    body = (
      <div className="animate-rise">
        <p className="text-xs uppercase tracking-wide text-slate-400">La canción era…</p>
        <p className="text-xl font-black">{revealed.title}</p>
        <p className="text-slate-500 dark:text-slate-300">{revealed.artist}</p>
      </div>
    );
  } else if (schedule) {
    const elapsed = now - schedule.serverTimestamp;
    const untilStart = schedule.startsAt - schedule.serverTimestamp - elapsed;
    const untilEnd = schedule.endsAt - schedule.serverTimestamp - elapsed;
    if (untilStart > 0) {
      body = (
        <p className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Clapperboard className="h-5 w-5 text-brand-500" aria-hidden />
          Empieza en {Math.max(1, Math.ceil(untilStart / 1000))}…
        </p>
      );
    } else if (untilEnd > 0) {
      const progress = 1 - untilEnd / schedule.durationMs;
      body = (
        <div>
          <p className="mb-2 flex items-center justify-center gap-2 text-lg font-semibold">
            {playing ? (
              <Music className="h-5 w-5 animate-pulse text-brand-500" aria-hidden />
            ) : (
              <Headphones className="h-5 w-5 text-brand-500" aria-hidden />
            )}
            {playing ? '¡Suena la canción!' : 'Escucha…'} ¿La tienes en el cartón?
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"
            role="progressbar"
            aria-valuenow={Math.round(progress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso del fragmento"
          >
            <div
              className="h-full bg-brand-500 transition-[width] duration-200"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          </div>
        </div>
      );
    } else {
      body = (
        <p className="flex items-center justify-center gap-2 text-lg font-semibold">
          <Timer className="h-5 w-5 text-accent-500" aria-hidden />
          Últimos segundos para marcar…
        </p>
      );
    }
  } else {
    body = (
      <p className="flex items-center justify-center gap-2 text-lg font-semibold">
        <Music className="h-5 w-5 text-slate-400" aria-hidden />
        Preparando la siguiente canción…
      </p>
    );
  }

  return (
    <div className="card p-4 text-center">
      <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">{roundLabel}</p>
      {body}
      {audioError && (
        <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-accent-500">
          <AlertTriangle className="h-4 w-4" aria-hidden />
          {audioError}
        </p>
      )}
    </div>
  );
}
