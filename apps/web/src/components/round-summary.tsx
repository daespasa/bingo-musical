'use client';

import { Flame, HeartCrack, Timer, TrendingUp, Users } from 'lucide-react';
import type { GuessEvaluationPayload, RoundResultsPayload } from '@bingo/shared';

/**
 * Lo que ha pasado en la ronda que acaba de terminar. Se enseña entre canción y
 * canción, que es el rato muerto donde la gente mira la pantalla.
 *
 * La estructura es la misma en todos los modos —un titular y debajo lo común—
 * pero el titular habla el idioma del modo: en bingo se «tiene» la canción en
 * el cartón, en los modos que preguntan se «acierta», y en supervivencia lo que
 * importa es quién ha caído.
 */
export function RoundSummary({
  results,
  guessEvaluation,
}: {
  results: RoundResultsPayload;
  /** Cómo se acertó, en respuesta libre. Nulo en el resto de modos. */
  guessEvaluation?: GuessEvaluationPayload | null;
}) {
  const { fastest, correctCount, totalPlayers, streaks, climbers, gameMode } = results;
  const esBingo = gameMode === 'MUSIC_BINGO';

  return (
    <section className="card animate-rise p-4">
      <h2 className="eyebrow mb-3">Cómo ha ido la ronda</h2>
      <ul className="flex flex-col gap-2 text-sm">
        <li className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          {correctCount === 0 ? (
            esBingo ? (
              <>No la tenía nadie.</>
            ) : (
              <>No la acertó nadie.</>
            )
          ) : (
            <>
              {esBingo ? 'La tenían' : 'La acertaron'}{' '}
              <strong className="data">{correctCount}</strong> de{' '}
              <span className="data">{totalPlayers}</span>.
            </>
          )}
        </li>

        {/*
         * En respuesta libre importa *cómo* se acertó: que una colara por
         * errata es media gracia del modo.
         */}
        {guessEvaluation && guessEvaluation.byType.FUZZY > 0 && (
          <li className="flex items-center gap-2">
            <Timer className="h-4 w-4 shrink-0 text-amber-500" aria-hidden />
            <span className="data">{guessEvaluation.byType.FUZZY}</span>{' '}
            {guessEvaluation.byType.FUZZY === 1 ? 'coló' : 'colaron'} con alguna errata.
          </li>
        )}

        {fastest && (
          <li className="flex items-center gap-2">
            <Timer className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />
            <strong>{fastest.alias}</strong> {esBingo ? 'la cazó' : 'respondió'} en{' '}
            <span className="data">{(fastest.latencyMs / 1000).toFixed(1)} s</span>.
          </li>
        )}

        {/* Supervivencia: quién ha caído y cuántos quedan. */}
        {results.eliminated.length > 0 && (
          <li className="flex items-center gap-2">
            <HeartCrack className="h-4 w-4 shrink-0 text-accent-500" aria-hidden />
            {results.eliminated.length === 1 ? (
              <>
                <strong>{results.eliminated[0]}</strong> se queda sin vidas.
              </>
            ) : (
              <>
                Caen <strong>{results.eliminated.join(', ')}</strong>.
              </>
            )}
          </li>
        )}

        {results.survivorsLeft !== null && results.survivorsLeft > 0 && (
          <li className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            Siguen en pie <span className="data">{results.survivorsLeft}</span>.
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
