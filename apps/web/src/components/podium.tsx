'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { GameFinishedPayload, HighlightPayload } from '@bingo/shared';
import { Leaderboard } from './leaderboard';

const HIGHLIGHT_LABELS: Record<HighlightPayload['type'], string> = {
  FASTEST_ANSWER: '⚡ Respuesta más rápida',
  LEADER_CHANGE: '🔄 Cambio de líder',
  BEST_STREAK: '🔥 Mayor racha',
  FIRST_LINE: '📣 Primera línea',
  BINGO: '🏆 Bingo',
  BIGGEST_COMEBACK: '🚀 Mayor remontada',
};

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 60 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      emoji: ['🎉', '🎊', '✨', '🎵', '⭐'][i % 5],
    })),
  );
  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute animate-[fall_4s_linear_infinite] text-xl"
          style={{ left: `${p.left}%`, animationDelay: `${p.delay}s`, top: '-2rem' }}
        >
          {p.emoji}
        </span>
      ))}
      <style jsx>{`
        @keyframes fall {
          to {
            transform: translateY(110vh) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}

/** Ceremonia: revela 3º, 2º, 1º de forma escalonada y luego highlights. */
export function PodiumCeremony({
  finished,
  highlightId,
  code,
}: {
  finished: GameFinishedPayload;
  highlightId?: string;
  code: string;
}) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [1000, 2500, 4000, 5500].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const [first, second, third] = finished.podium;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center gap-6 px-6 py-10">
      {step >= 3 && <Confetti />}
      <h1 className="text-3xl font-black">🏁 ¡Fin de la partida!</h1>

      <div className="flex w-full items-end justify-center gap-3">
        {second && (
          <div
            className={`flex-1 rounded-t-2xl bg-slate-300 p-4 pt-6 text-center transition-opacity duration-700 dark:bg-slate-600 ${step >= 2 ? 'opacity-100' : 'opacity-0'}`}
            style={{ minHeight: '7rem' }}
          >
            <p className="text-3xl">🥈</p>
            <p className="font-bold">{second.alias}</p>
            <p className="font-mono text-sm">{second.score}</p>
          </div>
        )}
        {first && (
          <div
            className={`flex-1 rounded-t-2xl bg-amber-300 p-4 pt-10 text-center transition-opacity duration-700 dark:bg-amber-500 ${step >= 3 ? 'opacity-100' : 'opacity-0'}`}
            style={{ minHeight: '9rem' }}
          >
            <p className="text-4xl">🥇</p>
            <p className="text-lg font-black">{first.alias}</p>
            <p className="font-mono">{first.score}</p>
          </div>
        )}
        {third && (
          <div
            className={`flex-1 rounded-t-2xl bg-orange-200 p-4 pt-4 text-center transition-opacity duration-700 dark:bg-orange-700 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}
            style={{ minHeight: '6rem' }}
          >
            <p className="text-3xl">🥉</p>
            <p className="font-bold">{third.alias}</p>
            <p className="font-mono text-sm">{third.score}</p>
          </div>
        )}
      </div>

      {step >= 4 && (
        <>
          {finished.highlights.length > 0 && (
            <section className="card w-full p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Momentazos
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {finished.highlights.map((h, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{HIGHLIGHT_LABELS[h.type]}</span>
                    <span className="font-semibold">{h.alias}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card w-full p-4">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
              Clasificación final
            </h2>
            <Leaderboard entries={finished.leaderboard} highlightId={highlightId} />
          </section>
          <Link href={`/room/${code}/results`} className="text-sm text-brand-600 hover:underline">
            Ver resumen de la partida
          </Link>
          <Link href="/" className="btn-secondary">
            Salir
          </Link>
        </>
      )}
    </main>
  );
}
