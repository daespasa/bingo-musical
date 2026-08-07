'use client';

import { Flame, Timer, TrendingUp, Users } from 'lucide-react';
import type { RoundResultsPayload } from '@bingo/shared';

/**
 * Lo que ha pasado en la ronda que acaba de terminar. Se enseña entre canción y
 * canción, que es el rato muerto donde la gente mira la pantalla.
 */
export function RoundSummary({ results }: { results: RoundResultsPayload }) {
  const { fastest, correctCount, totalPlayers, streaks, climbers } = results;

  return (
    <section className="card animate-rise p-4">
      <h2 className="eyebrow mb-3">Cómo ha ido la ronda</h2>
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {correctCount === 0 ? (
            <>No la tenía nadie.</>
          ) : (
            <>
              La tenían <strong className="data">{correctCount}</strong> de{' '}
              <span className="data">{totalPlayers}</span>.
            </>
          )}
        </li>

        {fastest && (
          <li className="flex items-center gap-2">
            <Timer className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <strong>{fastest.alias}</strong> la cazó en{' '}
            <span className="data">{(fastest.latencyMs / 1000).toFixed(1)} s</span>.
          </li>
        )}

        {streaks.map((s) => (
          <li key={s.alias} className="flex items-center gap-2">
            <Flame className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <strong>{s.alias}</strong> lleva <span className="data">{s.streak}</span> seguidas.
          </li>
        ))}

        {climbers.map((c) => (
          <li key={c.alias} className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden />
            <strong>{c.alias}</strong> sube del <span className="data">{c.from}º</span> al{' '}
            <span className="data">{c.to}º</span>.
          </li>
        ))}
      </ul>
    </section>
  );
}
