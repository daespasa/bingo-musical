'use client';

import clsx from 'clsx';
import type { CardView } from '@bingo/shared';

export function BingoCardGrid({
  card,
  onMark,
  disabled,
}: {
  card: CardView;
  onMark: (cellId: string) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${card.size}, minmax(0, 1fr))` }}
      role="grid"
      aria-label="Cartón de bingo"
    >
      {card.cells.map((cell) => {
        const marked = cell.status === 'VALID' || cell.isFree;
        const wrong = cell.status === 'INVALID';
        return (
          <button
            key={cell.id}
            role="gridcell"
            disabled={disabled || marked || wrong}
            onClick={() => onMark(cell.id)}
            className={clsx(
              'flex aspect-square flex-col items-center justify-center rounded-xl border p-1 text-center transition active:scale-95',
              marked &&
                'border-emerald-400 bg-emerald-100 text-emerald-900 dark:bg-emerald-900/50 dark:text-emerald-100',
              wrong && 'border-rose-300 bg-rose-100 opacity-60 dark:bg-rose-900/40',
              !marked &&
                !wrong &&
                'border-slate-300 bg-white hover:border-brand-400 dark:border-slate-700 dark:bg-slate-800',
            )}
          >
            <span
              className={clsx(
                'font-semibold leading-tight',
                card.size === 5 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm',
              )}
            >
              {marked && !cell.isFree ? '✅ ' : ''}
              {cell.displayTitle}
            </span>
            {cell.displayArtist && (
              <span className="mt-0.5 text-[9px] text-slate-500 dark:text-slate-400 sm:text-[10px]">
                {cell.displayArtist}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
