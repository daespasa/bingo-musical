'use client';

import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import type { QuizDistributionPayload, QuizQuestionView } from '@bingo/shared';

/** Cada opción se numera como un corte del disco: A, B, C, D. */
const LETTERS = ['A', 'B', 'C', 'D'] as const;

type Props = {
  question: QuizQuestionView;
  /** Opción elegida, si ya se ha respondido. */
  myAnswer: number | null;
  /** Solución y reparto. Nulo mientras la ronda sigue abierta. */
  distribution: QuizDistributionPayload | null;
  disabled?: boolean;
  onAnswerAction: (optionIndex: number) => void;
};

/**
 * Las opciones de una pregunta.
 *
 * Mientras la ronda está abierta, el componente **no sabe** cuál es la
 * correcta: `question` no trae esa información. Solo al llegar `distribution`
 * aparece la solución, que es lo que impide averiguarla inspeccionando la
 * página.
 */
export function QuizOptions({ question, myAnswer, distribution, disabled, onAnswerAction }: Props) {
  const revealed = distribution !== null;
  const totalAnswers = distribution ? distribution.counts.reduce((a, b) => a + b, 0) : 0;

  return (
    <div className="card p-4">
      <p className="eyebrow mb-3">Pregunta</p>
      <h2 className="mb-4 font-display text-xl leading-tight">{question.prompt}</h2>

      <ul className="grid gap-2 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const chosen = myAnswer === index;
          const isCorrect = revealed && distribution.correctIndex === index;
          const isWrongChoice = revealed && chosen && !isCorrect;
          const count = distribution?.counts[index] ?? 0;
          const share = totalAnswers > 0 ? (count / totalAnswers) * 100 : 0;

          return (
            <li key={option}>
              <button
                type="button"
                disabled={disabled || revealed || myAnswer !== null}
                aria-pressed={chosen}
                /*
                 * Etiqueta explícita: sin ella, el nombre accesible se
                 * compone de la letra, el texto y el recuento, que cambia al
                 * revelar y hace que el botón «se llame» distinto según el
                 * momento.
                 */
                aria-label={[
                  `Opción ${LETTERS[index]}: ${option}`,
                  chosen ? 'Tu respuesta.' : '',
                  isCorrect ? 'Respuesta correcta.' : '',
                  isWrongChoice ? 'Respuesta incorrecta.' : '',
                  revealed ? `${count} de ${totalAnswers} respuestas.` : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onAnswerAction(index)}
                className={clsx(
                  'relative min-h-14 w-full overflow-hidden rounded-md border-2 px-3 py-2.5 text-left transition-all duration-100',
                  'disabled:pointer-events-none',
                  !revealed &&
                    chosen &&
                    'border-brand-600 bg-brand-50 shadow-sleeve dark:bg-brand-900/30',
                  !revealed &&
                    !chosen &&
                    'border-slate-900 bg-slate-50 shadow-sleeve hover:bg-slate-100 active:translate-y-0.5 active:shadow-none dark:border-slate-700 dark:bg-slate-900 dark:shadow-none dark:hover:bg-slate-800',
                  isCorrect && 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/40',
                  isWrongChoice && 'border-accent-500 bg-rose-50 dark:bg-rose-900/30',
                  // Las descartadas se apagan, pero siguen legibles.
                  revealed &&
                    !isCorrect &&
                    !isWrongChoice &&
                    'border-slate-300 opacity-60 dark:border-slate-700',
                )}
              >
                {/*
                 * El reparto se rellena dentro del propio botón, como el nivel
                 * de un vúmetro. Va detrás del texto y no lo tapa.
                 */}
                {revealed && share > 0 && (
                  <span
                    aria-hidden
                    className={clsx(
                      'absolute inset-y-0 left-0 -z-10',
                      isCorrect
                        ? 'bg-emerald-200/70 dark:bg-emerald-800/50'
                        : 'bg-slate-200/70 dark:bg-slate-800/60',
                    )}
                    style={{ width: `${share}%` }}
                  />
                )}

                <span className="flex items-center gap-2.5">
                  <span className="data shrink-0 rounded border-2 border-current px-1.5 py-0.5 text-xs">
                    {LETTERS[index]}
                  </span>
                  <span className="min-w-0 flex-1 font-semibold leading-tight">{option}</span>

                  {/* La forma distingue el resultado; el color solo acompaña. */}
                  {isCorrect && <Check className="h-5 w-5 shrink-0 text-emerald-700" aria-hidden />}
                  {isWrongChoice && <X className="h-5 w-5 shrink-0 text-accent-500" aria-hidden />}

                  {revealed && (
                    <span className="data shrink-0 text-xs text-slate-600 dark:text-slate-300">
                      {count}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p
        className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400"
        aria-live="polite"
      >
        {revealed
          ? `La respuesta era ${distribution.correctText}`
          : myAnswer !== null
            ? 'Respuesta enviada · esperando al resto'
            : disabled
              ? 'Prepara el oído…'
              : 'Elige una opción'}
      </p>
    </div>
  );
}
