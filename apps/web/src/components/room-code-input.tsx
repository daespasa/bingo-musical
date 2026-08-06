'use client';

import { useRef } from 'react';
import clsx from 'clsx';
import { ROOM_CODE_LENGTH, normalizeRoomCode } from '@bingo/shared';

/**
 * Código de sala en seis casillas. Por debajo es un único campo de texto: el
 * teclado, el pegado, el autorrelleno y los lectores de pantalla siguen viendo
 * un solo control, y las casillas son la representación visual del valor.
 *
 * Se prefiere esto a seis campos encadenados porque estos rompen el pegado,
 * el borrado hacia atrás y la navegación con teclado.
 */
export function RoomCodeInput({
  value,
  onChange,
  onComplete,
  autoFocus,
}: {
  value: string;
  onChange: (code: string) => void;
  /** Se dispara cuando el código llega a su longitud completa. */
  onComplete?: (code: string) => void;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const chars = Array.from({ length: ROOM_CODE_LENGTH }, (_, i) => value[i] ?? '');
  const activeIndex = Math.min(value.length, ROOM_CODE_LENGTH - 1);

  return (
    <div
      className="relative"
      onClick={() => inputRef.current?.focus()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') return;
        inputRef.current?.focus();
      }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          const next = normalizeRoomCode(e.target.value);
          onChange(next);
          if (next.length === ROOM_CODE_LENGTH) onComplete?.(next);
        }}
        inputMode="text"
        autoCapitalize="characters"
        autoComplete="one-time-code"
        autoCorrect="off"
        spellCheck={false}
        maxLength={ROOM_CODE_LENGTH}
        // El foco automático es correcto aquí: escribir el código es lo único
        // que se puede hacer en esta pantalla.
        autoFocus={autoFocus}
        aria-label="Código de sala"
        // El campo real queda encima de las casillas pero invisible, de modo
        // que el cursor y el teclado del móvil se comportan como siempre.
        className="absolute inset-0 h-full w-full cursor-pointer text-transparent caret-transparent opacity-0"
      />
      <div className="pointer-events-none flex justify-between gap-1.5 sm:gap-2" aria-hidden>
        {chars.map((char, index) => (
          <span
            key={index}
            className={clsx(
              'flex h-14 flex-1 items-center justify-center rounded border-2 font-mono text-2xl uppercase transition-colors sm:h-16 sm:text-3xl',
              char
                ? 'border-slate-900 bg-slate-50 text-slate-900 dark:border-slate-100 dark:bg-slate-900 dark:text-slate-100'
                : 'border-slate-300 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-900/60',
              !char && index === activeIndex && 'border-brand-600 dark:border-brand-400',
            )}
          >
            {char}
          </span>
        ))}
      </div>
    </div>
  );
}
