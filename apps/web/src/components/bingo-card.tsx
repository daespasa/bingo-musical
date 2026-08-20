'use client';

import { useState } from 'react';
import Image from 'next/image';
import clsx from 'clsx';
import { Check, Star, X } from 'lucide-react';
import type { CardView } from '@bingo/shared';

/**
 * La carátula del álbum, detrás del texto de la casilla. Va desenfocada
 * mientras la casilla sigue en juego y se ve nítida cuando queda resuelta
 * —marcada o fallada—, que es cuando la canción ya se ha revelado. El
 * desenfoque es recompensa visual, no ocultación: el título se lee siempre.
 *
 * Si la imagen no carga, la casilla vuelve a ser la de solo texto de siempre;
 * nunca se deja un hueco roto.
 */
function CellArtwork({ url, sharp }: { url: string; sharp: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span aria-hidden className="absolute inset-0">
      <Image
        src={url}
        alt=""
        fill
        // Una casilla, no la pantalla: se pide el tamaño pequeño de la CDN.
        sizes="(max-width: 640px) 20vw, 96px"
        onError={() => setFailed(true)}
        className={clsx(
          'object-cover transition-[filter] duration-300 motion-reduce:transition-none',
          !sharp && 'blur-[3px] saturate-50',
        )}
      />
      {/*
       * Velo: el título tiene que leerse encima de cualquier carátula. Al 60 %
       * en claro y al 70 % en oscuro, el peor caso —texto sobre la tinta del
       * vinilo— queda en 5,7:1 y 6,3:1, por encima del mínimo de 4,5:1.
       */}
      <span className="absolute inset-0 bg-slate-50/60 dark:bg-slate-950/70" />
    </span>
  );
}

export function BingoCardGrid({
  card,
  onMark,
  disabled,
  lineRows,
  bingo,
  showArtwork = false,
}: {
  card: CardView;
  onMark: (cellId: string) => void;
  disabled: boolean;
  /** Filas con línea confirmada, para resaltarlas. */
  lineRows?: number[];
  /** Cartón completo confirmado. */
  bingo?: boolean;
  /** Opción del bingo: las casillas enseñan la carátula del álbum. */
  showArtwork?: boolean;
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
        const conPortada = showArtwork && !cell.isFree && Boolean(cell.coverUrl);

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
              'relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded border-2 p-1 text-center transition-all duration-150',
              marked &&
                'animate-mark border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100',
              cell.isFree &&
                'border-brand-600 bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100',
              wrong &&
                'animate-shake border-rose-300 bg-rose-100 text-rose-900 line-through opacity-70 dark:border-rose-500 dark:bg-rose-900 dark:text-rose-100',
              inLine && 'animate-line ring-2 ring-amber-400',
              !marked &&
                !wrong &&
                !cell.isFree &&
                'border-slate-300 bg-slate-50 text-slate-800 hover:border-slate-900 hover:shadow-sleeve active:translate-y-0.5 active:shadow-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-100 dark:hover:shadow-none',
            )}
          >
            {conPortada && <CellArtwork url={cell.coverUrl!} sharp={marked || wrong} />}
            {(marked || wrong) && (
              <span
                className={clsx(
                  'absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-slate-50',
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
                    'relative font-semibold leading-tight',
                    card.size === 5 ? 'text-[10px] sm:text-xs' : 'text-xs sm:text-sm',
                  )}
                >
                  {cell.displayTitle}
                </span>
                {cell.displayArtist && (
                  <span
                    className={clsx(
                      'relative mt-0.5 font-mono text-[9px] uppercase tracking-wide sm:text-[10px]',
                      // Sobre una carátula, el gris del artista no llegaría al
                      // contraste mínimo: ahí va con la misma tinta del título.
                      conPortada
                        ? 'text-slate-800 dark:text-slate-100'
                        : 'text-slate-500 dark:text-slate-400',
                    )}
                  >
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
