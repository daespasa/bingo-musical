'use client';

import { useState, type FormEvent } from 'react';
import clsx from 'clsx';
import { Check, Send, X } from 'lucide-react';
import type { FreeTextQuestionView, GuessEvaluationPayload } from '@bingo/shared';

type Props = {
  question: FreeTextQuestionView;
  /** Intentos ya escritos, en orden. */
  attempts: string[];
  /** Cuántos quedan; `null` es ilimitado, `undefined` aún no se sabe. */
  attemptsLeft?: number | null;
  /** Resolución de la ronda. Nula mientras sigue abierta. */
  evaluation: GuessEvaluationPayload | null;
  disabled?: boolean;
  onSubmitAction: (text: string) => void;
};

/** Cómo se llegó al acierto, en palabras. */
const MATCH_LABELS: Record<string, string> = {
  EXACT: 'exactas',
  ALIAS: 'por título alternativo',
  NORMALIZED: 'sin tildes ni mayúsculas',
  FUZZY: 'con alguna errata',
};

/**
 * Campo de respuesta escrita.
 *
 * Mientras la ronda está abierta no se dice si un intento ha acertado: la
 * evaluación llega entera al revelarse. Lo que sí se ve es qué se ha probado
 * ya, para no repetirlo sin darse cuenta.
 */
export function GuessInput({
  question,
  attempts,
  attemptsLeft,
  evaluation,
  disabled,
  onSubmitAction,
}: Props) {
  const [text, setText] = useState('');
  const revealed = evaluation !== null;
  const sinIntentos = attemptsLeft === 0;
  const bloqueado = disabled || revealed || sinIntentos;

  const enviar = (event: FormEvent) => {
    event.preventDefault();
    const limpio = text.trim();
    if (limpio.length === 0 || bloqueado) return;
    onSubmitAction(limpio);
    setText('');
  };

  return (
    <div className="card p-4">
      <p className="eyebrow mb-3">Adivina</p>
      <h2 id="guess-prompt" className="mb-4 font-display text-xl leading-tight">
        {question.prompt}
      </h2>

      {/* Enter envía: es un campo único, no hace falta buscar el botón. */}
      <form onSubmit={enviar} className="flex gap-2">
        {/*
         * El campo se etiqueta con el propio enunciado en lugar de repetirlo
         * en un label oculto: duplicarlo hace que un lector de pantalla lo
         * lea dos veces.
         */}
        <input
          id="guess"
          aria-labelledby="guess-prompt"
          className="input flex-1"
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={bloqueado}
          autoComplete="off"
          placeholder={bloqueado ? '' : 'Escribe tu respuesta…'}
          maxLength={120}
        />
        <button
          type="submit"
          className="btn-primary shrink-0 px-4"
          disabled={bloqueado || text.trim().length === 0}
        >
          <Send className="h-4 w-4" aria-hidden />
          <span className="sr-only sm:not-sr-only">Enviar</span>
        </button>
      </form>

      {attempts.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-2">
          {attempts.map((attempt, index) => (
            <li
              key={`${attempt}-${index}`}
              className="data rounded border-2 border-slate-300 px-2 py-1 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {attempt}
            </li>
          ))}
        </ul>
      )}

      <p
        className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
        aria-live="polite"
      >
        {revealed
          ? `La respuesta era ${evaluation.correctText}`
          : bloqueado
            ? sinIntentos
              ? 'Sin intentos · esperando el resultado'
              : 'Prepara el oído…'
            : attemptsLeft === null || attemptsLeft === undefined
              ? 'Escribe lo que estás escuchando'
              : `Te ${attemptsLeft === 1 ? 'queda' : 'quedan'} ${attemptsLeft} ${attemptsLeft === 1 ? 'intento' : 'intentos'}`}
      </p>

      {revealed && (
        <div className="mt-3 border-t-2 border-dashed border-slate-300 pt-3 dark:border-slate-700">
          <p className="flex items-center gap-2 text-sm">
            {evaluation.correctCount > 0 ? (
              <Check className="h-4 w-4 text-emerald-700" aria-hidden />
            ) : (
              <X className="h-4 w-4 text-accent-500" aria-hidden />
            )}
            <span>
              {evaluation.correctCount === 0
                ? 'No la reconoció nadie'
                : `La acertaron ${evaluation.correctCount} de ${evaluation.totalPlayers}`}
            </span>
          </p>
          {/* De qué manera se acertó: que una colara por errata tiene gracia. */}
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {Object.entries(evaluation.byType)
              .filter(([, count]) => count > 0)
              .map(([type, count]) => (
                <li
                  key={type}
                  className={clsx(
                    'font-mono text-xs uppercase tracking-[0.1em]',
                    type === 'FUZZY'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400',
                  )}
                >
                  {count} {MATCH_LABELS[type] ?? type}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}
