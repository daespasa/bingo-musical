'use client';

import clsx from 'clsx';
import { Heart, HeartCrack } from 'lucide-react';
import type { MyLivesView, SurvivalStandingView } from '@bingo/shared';

/**
 * Vidas propias.
 *
 * Los corazones son el adorno; el dato es el texto. Quien no distingue colores
 * ni ve los iconos tiene que poder leer cuántas vidas le quedan, así que la
 * cifra va escrita y no solo dibujada.
 */
export function MyLives({ myLives, max }: { myLives: MyLivesView; max: number }) {
  if (!myLives) return null;

  if (myLives.eliminated) {
    return (
      <div
        role="status"
        aria-label="Tus vidas"
        className="card flex items-center gap-3 border-accent-500 p-4"
      >
        <HeartCrack className="h-6 w-6 shrink-0 text-accent-500" aria-hidden />
        <div>
          <p className="font-display text-lg leading-tight">Estás eliminado</p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Sigues viendo la partida, las respuestas y la clasificación.
          </p>
        </div>
      </div>
    );
  }

  return (
    // Región viva: perder una vida es la información más importante de la
    // ronda y debe anunciarse sin tener que ir a buscarla.
    <div
      role="status"
      aria-live="polite"
      aria-label="Tus vidas"
      className="card flex items-center gap-3 p-4"
    >
      <span className="flex shrink-0 gap-1" aria-hidden>
        {Array.from({ length: max }, (_, index) => (
          <Heart
            key={index}
            className={clsx(
              'h-5 w-5',
              index < myLives.lives ? 'fill-accent-500 text-accent-500' : 'text-slate-300',
            )}
          />
        ))}
      </span>
      <p className="font-display text-lg leading-tight">
        {myLives.lives} {myLives.lives === 1 ? 'vida' : 'vidas'}
        {myLives.lives === 1 && (
          <span className="ml-2 font-sans text-sm font-normal text-accent-500">
            · última oportunidad
          </span>
        )}
      </p>
    </div>
  );
}

/** Quién sigue en pie, para la sala y el proyector. */
export function SurvivalStandings({
  standings,
  compact,
}: {
  standings: SurvivalStandingView[];
  compact?: boolean;
}) {
  if (standings.length === 0) return null;
  const vivos = standings.filter((s) => !s.eliminated);

  return (
    <section className={compact ? '' : 'card p-4'}>
      <h2 className="eyebrow mb-3">
        En pie: {vivos.length} de {standings.length}
      </h2>
      <ul className="flex flex-col gap-1.5">
        {standings.map((entry) => (
          <li
            key={entry.participantId}
            className={clsx(
              'flex items-center justify-between gap-3 text-sm',
              entry.eliminated && 'opacity-50',
            )}
          >
            <span className={clsx('truncate', entry.eliminated && 'line-through')}>
              {entry.alias}
            </span>
            <span className="data shrink-0 text-xs">
              {entry.eliminated
                ? `Eliminado en la ronda ${(entry.eliminatedAtRound ?? 0) + 1}`
                : `${entry.lives} ${entry.lives === 1 ? 'vida' : 'vidas'}`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
