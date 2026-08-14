'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Award,
  Flag,
  Flame,
  Heart,
  Medal,
  Megaphone,
  Repeat,
  Rocket,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import type {
  GameFinishedPayload,
  GameMode,
  HighlightPayload,
  LeaderboardEntry,
} from '@bingo/shared';
import { ExitGameLink } from '@/components/exit-game-link';
import { api } from '@/lib/api';
import { Leaderboard } from './leaderboard';

const HIGHLIGHTS: Record<
  HighlightPayload['type'],
  { label: string; Icon: typeof Zap; className: string }
> = {
  FASTEST_ANSWER: { label: 'Respuesta más rápida', Icon: Zap, className: 'text-amber-500' },
  LEADER_CHANGE: { label: 'Cambio de líder', Icon: Repeat, className: 'text-brand-600' },
  BEST_STREAK: { label: 'Mayor racha', Icon: Flame, className: 'text-orange-500' },
  FIRST_LINE: { label: 'Primera línea', Icon: Megaphone, className: 'text-brand-500' },
  BINGO: { label: 'Bingo', Icon: Trophy, className: 'text-amber-500' },
  BIGGEST_COMEBACK: { label: 'Mayor remontada', Icon: Rocket, className: 'text-emerald-500' },
  // Modos de pregunta
  ONLY_CORRECT: { label: 'Único acierto', Icon: Sparkles, className: 'text-amber-500' },
  ALL_CORRECT: { label: 'Acertaron todos', Icon: Sparkles, className: 'text-emerald-500' },
  NOBODY_CORRECT: { label: 'No acertó nadie', Icon: Megaphone, className: 'text-slate-500' },
  POPULAR_DISTRACTOR: { label: 'La trampa favorita', Icon: Repeat, className: 'text-rose-500' },
  // Supervivencia
  FIRST_ELIMINATION: { label: 'Primera eliminación', Icon: Heart, className: 'text-rose-500' },
  LAST_SURVIVOR: { label: 'Último superviviente', Icon: Trophy, className: 'text-amber-500' },
  MULTIPLE_ELIMINATION: { label: 'Caída múltiple', Icon: Heart, className: 'text-accent-500' },
  SURVIVED_ON_ONE_LIFE: {
    label: 'Aguantó con una vida',
    Icon: Flame,
    className: 'text-orange-500',
  },
};

/**
 * Cómo se llama la clasificación en cada modo.
 *
 * En supervivencia no es «quién puntuó más»: es quién aguantó, y llamarla
 * igual que en el resto contaría la partida al revés.
 */
const RANKING_LABEL: Record<GameMode, string> = {
  MUSIC_BINGO: 'Clasificación final',
  MULTIPLE_CHOICE: 'Clasificación final',
  FREE_TEXT: 'Clasificación final',
  SURVIVAL: 'Quién aguantó más',
  MIXED: 'Clasificación final',
};

const CONFETTI_COLORS = ['#a855f7', '#f43f5e', '#fbbf24', '#34d399', '#38bdf8'];

function Confetti() {
  const [pieces] = useState(() =>
    Array.from({ length: 70 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 3,
      duration: 3 + Math.random() * 2,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: i % 3 === 0,
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
          className="animate-confetti absolute top-0 block"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${p.size * 1.6}px`,
            backgroundColor: p.color,
            borderRadius: p.round ? '9999px' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function PodiumStep({
  entry,
  place,
  visible,
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  visible: boolean;
}) {
  const config = {
    1: {
      Icon: Trophy,
      bg: 'bg-amber-300 dark:bg-amber-500',
      height: '9rem',
      pad: 'pt-10',
      iconSize: 'h-9 w-9',
    },
    2: {
      Icon: Medal,
      bg: 'bg-slate-300 dark:bg-slate-600',
      height: '7rem',
      pad: 'pt-6',
      iconSize: 'h-7 w-7',
    },
    3: {
      Icon: Award,
      bg: 'bg-orange-200 dark:bg-orange-700',
      height: '6rem',
      pad: 'pt-4',
      iconSize: 'h-7 w-7',
    },
  }[place];

  return (
    <div
      className={`flex-1 rounded-t-2xl ${config.bg} ${config.pad} p-4 text-center transition-opacity duration-700 ${
        visible ? 'animate-rise opacity-100' : 'opacity-0'
      }`}
      style={{ minHeight: config.height }}
    >
      <config.Icon className={`mx-auto ${config.iconSize} text-slate-900/80`} aria-hidden />
      <p className={place === 1 ? 'text-lg font-black' : 'font-bold'}>{entry.alias}</p>
      <p className="font-mono text-sm tabular-nums">{entry.score}</p>
      <span className="sr-only">Puesto {place}</span>
    </div>
  );
}

/** Ceremonia: revela 3.º, 2.º, 1.º de forma escalonada y luego los momentazos. */
export function PodiumCeremony({
  finished,
  highlightId,
  code,
  /** Solo el anfitrión puede convocar la revancha. */
  canRematch,
}: {
  finished: GameFinishedPayload;
  highlightId?: string;
  code: string;
  canRematch?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [rematching, setRematching] = useState(false);
  const [rematchError, setRematchError] = useState<string | null>(null);
  useEffect(() => {
    const timers = [1000, 2500, 4000, 5500].map((ms, i) => setTimeout(() => setStep(i + 1), ms));
    return () => timers.forEach(clearTimeout);
  }, []);

  const [first, second, third] = finished.podium;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center gap-6 px-6 py-10">
      {step >= 3 && <Confetti />}
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <Flag className="h-7 w-7 text-brand-600" aria-hidden />
        ¡Fin de la partida!
      </h1>

      <div className="flex w-full items-end justify-center gap-3">
        {second && <PodiumStep entry={second} place={2} visible={step >= 2} />}
        {first && <PodiumStep entry={first} place={1} visible={step >= 3} />}
        {third && <PodiumStep entry={third} place={3} visible={step >= 1} />}
      </div>

      {step >= 4 && (
        <>
          {finished.highlights.length > 0 && (
            <section className="card animate-rise w-full p-4">
              <h2 className="mb-2 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-400">
                <Sparkles className="h-4 w-4" aria-hidden />
                Momentazos
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {finished.highlights.map((h, i) => {
                  const cfg = HIGHLIGHTS[h.type];
                  return (
                    <li key={i} className="flex justify-between">
                      <span className="flex items-center gap-2">
                        <cfg.Icon className={`h-4 w-4 ${cfg.className}`} aria-hidden />
                        {cfg.label}
                      </span>
                      <span className="font-semibold">{h.alias}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          {/*
           * Supervivencia se cuenta al revés que el resto: importa el orden en
           * que fue cayendo la gente, no solo quién puntuó más.
           */}
          {finished.eliminationOrder.length > 0 && (
            <section className="card animate-rise w-full p-4">
              <h2 className="eyebrow mb-3">Orden de caída</h2>
              <ol className="flex flex-col gap-1 text-sm">
                {finished.eliminationOrder.map((alias, i) => (
                  <li key={`${alias}-${i}`} className="flex justify-between">
                    <span className="data text-slate-500 dark:text-slate-400">{i + 1}º</span>
                    <span>{alias}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section className="card animate-rise w-full p-4">
            <h2 className="eyebrow mb-3">{RANKING_LABEL[finished.gameMode]}</h2>
            <Leaderboard entries={finished.leaderboard} highlightId={highlightId} />
          </section>
          {canRematch && (
            <button
              className="btn-primary"
              disabled={rematching}
              onClick={() => {
                setRematching(true);
                setRematchError(null);
                // La revancha crea una partida gemela y una sala nueva: esta
                // queda intacta en el historial.
                api<{ code: string }>(`/rooms/${code}/rematch`, {
                  method: 'POST',
                  body: JSON.stringify({ mode: 'REMOTE' }),
                })
                  .then((room) => {
                    window.location.href = `/room/${room.code}/host`;
                  })
                  .catch(() => {
                    setRematchError('No se pudo crear la revancha');
                    setRematching(false);
                  });
              }}
            >
              <Repeat className="h-4 w-4" aria-hidden />
              {rematching ? 'Creando sala…' : 'Jugar revancha'}
            </button>
          )}
          {rematchError && (
            <p role="alert" className="text-sm text-accent-500">
              {rematchError}
            </p>
          )}
          <Link href={`/room/${code}/results`} className="text-sm text-brand-600 hover:underline">
            Ver resumen de la partida
          </Link>
          <ExitGameLink />
        </>
      )}
    </main>
  );
}
