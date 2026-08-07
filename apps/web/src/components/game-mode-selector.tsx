'use client';

import clsx from 'clsx';
import { GAME_MODE_CATALOG, type GameMode, type GameModeDescriptor } from '@bingo/shared';
import { GAME_MODE_VISUALS } from '@/lib/game-modes';

type Props = {
  value: GameMode;
  onSelectAction: (mode: GameMode) => void;
};

const DIFFICULTY_LABEL: Record<GameModeDescriptor['difficulty'], string> = {
  RELAJADA: 'Dificultad relajada',
  MEDIA: 'Dificultad media',
  EXIGENTE: 'Dificultad exigente',
};

/**
 * Primer paso de la partida: a qué se juega.
 *
 * Los modos que todavía no se pueden jugar de principio a fin se enseñan como
 * «Próximamente» y no se pueden elegir. Enseñarlos disponibles sería prometer
 * algo que al pulsar no lleva a ninguna parte; esconderlos del todo dejaría al
 * anfitrión sin saber hacia dónde va Gramola.
 */
export function GameModeSelector({ value, onSelectAction }: Props) {
  return (
    <fieldset>
      <legend className="label">¿A qué quieres jugar?</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {GAME_MODE_CATALOG.map((mode) => {
          const { icon: Icon, iconLabel } = GAME_MODE_VISUALS[mode.id];
          const available = mode.availability === 'DISPONIBLE';
          const selected = value === mode.id;

          return (
            <button
              key={mode.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!available}
              onClick={() => onSelectAction(mode.id)}
              className={clsx(
                'rounded-xl border p-4 text-left transition',
                selected && 'border-brand-500 bg-brand-50 dark:bg-brand-900/30',
                !selected &&
                  available &&
                  'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                !available &&
                  'cursor-not-allowed border-dashed border-slate-300 opacity-60 dark:border-slate-700',
              )}
            >
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-4 w-4 text-brand-500" aria-hidden />
                {mode.name}
                {!available && (
                  <span className="ml-auto rounded border border-slate-400 px-1.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                    Próximamente
                  </span>
                )}
              </span>
              <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                {mode.description}
              </span>
              {/*
               * Los datos de la tarjeta van en texto, no en iconos sueltos:
               * es lo que hace que la tarjeta se entienda leída en voz alta.
               */}
              <span className="mt-2 block font-mono text-[0.7rem] uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
                {mode.recommendedPlayers.min}–{mode.recommendedPlayers.max} jugadores ·{' '}
                {DIFFICULTY_LABEL[mode.difficulty]}
              </span>
              <span className="sr-only">
                {iconLabel}. {mode.supportsProjector ? 'Admite proyector.' : 'Sin proyector.'}{' '}
                {mode.supportsRemote ? 'Admite juego remoto.' : 'Sin juego remoto.'}{' '}
                {available ? 'Disponible.' : 'Todavía no disponible.'}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
