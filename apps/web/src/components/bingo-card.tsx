'use client';

import clsx from 'clsx';
import { Check, Star, X } from 'lucide-react';
import type { CardView } from '@bingo/shared';

export function BingoCardGrid({
  card,
  onMark,
  disabled,
  lineRows,
  bingo,
}: {
  card: CardView;
  onMark: (cellId: string) => void;
  disabled: boolean;
  /** Filas con línea confirmada, para resaltarlas. */
  lineRows?: number[];
  /** Cartón completo confirmado. */
  bingo?: boolean;
}) {
  return (
    <div
      className={clsx('grid gap-2 transition-transform', bingo && 'animate-bingo')}
      style={{ gridTemplateColumns: `repeat(${card.size}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Cartón de bingo"
    >
      {card.cells.map((cell) => {
        const marked = cell.status === 'VALID' && !cell.isFree;
        const wrong = cell.status === 'INVALID';
        const inLine = lineRows?.includes(Math.floor(cell.position / card.size)) ?? false;

        return (
          <button
            key={cell.id}
            role="gridcell"
            aria-label={`${cell.displayTitle}${cell.displayArtist ? `, ${cell.displayArtist}` : ''}${
              marked ? ' (acertada)' : wrong ? ' (fallada)' : ''
            }`}
            aria-pressed={marked || cell.isFree}
            disabled={disabled || marked || wrong || cell.isFree}
            onClick={() => onMark(cell.id)}
            className={clsx(
              'relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-xl border p-1 text-center transition-all duration-200 active:scale-95',
              marked &&
                'animate-mark border-emerald-400 bg-emerald-100 text-emerald-900 shadow-[0_0_0_2px_rgba(52,211,153,0.4)] dark:bg-emerald-900/50 dark:text-emerald-100',
              cell.isFree &&
                'border-brand-400 bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100',
              wrong && 'animate-shake border-rose-300 bg-rose-100 opacity-60 dark:bg-rose-900/40',
              inLine && 'animate-line ring-2 ring-amber-400',
              !marked &&
                !wrong &&
                !cell.isFree &&
                'border-slate-300 bg-white hover:-translate-y-0.5 hover:border-brand-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800',
            )}
          >
            {(marked || wrong) && (
              <span
                className={clsx(
                  'absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-white',
                  marked ? 'animate-pop bg-emerald-500' : 'bg-rose-500',
                )}
                aria-hidden
              >
                {marked ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              </span>
            )}
            {cell.isFree ? (
              <Star className="h-5 w-5 fill-current" aria-hidden />
            ) : (
              <>
                <span
                  className={clsx(
                    'font-semibold leading-tight',
                    card.size === 5 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm',
                  )}
                >
                  {cell.displayTitle}
                </span>
                {cell.displayArtist && (
                  <span className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400 sm:text-[10px]">
                    {cell.displayArtist}
                  </span>
                )}
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
