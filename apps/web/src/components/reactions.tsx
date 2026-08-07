'use client';

import { useEffect, useState } from 'react';
import { Flame, Hand, Heart, Laugh, Music2, PartyPopper } from 'lucide-react';
import type { Reaction, ReactionPayload } from '@bingo/shared';
import { REACTIONS } from '@bingo/shared';

const ICONS: Record<Reaction, typeof Flame> = {
  fuego: Flame,
  aplauso: Hand,
  risa: Laugh,
  corazon: Heart,
  fiesta: PartyPopper,
  baile: Music2,
};

const LABELS: Record<Reaction, string> = {
  fuego: 'Temazo',
  aplauso: 'Aplauso',
  risa: 'Risa',
  corazon: 'Me encanta',
  fiesta: 'Fiesta',
  baile: 'A bailar',
};

const COLORS: Record<Reaction, string> = {
  fuego: 'text-brand-500',
  aplauso: 'text-amber-400',
  risa: 'text-amber-300',
  corazon: 'text-accent-400',
  fiesta: 'text-emerald-400',
  baile: 'text-brand-300',
};

type Floating = ReactionPayload & { id: number; left: number; delay: number };

/**
 * Capa de reacciones de la pantalla de proyección: cada una sube flotando y
 * desaparece. Solo decora, así que no captura clics ni se anuncia a los
 * lectores de pantalla.
 */
export function ReactionLayer({ incoming }: { incoming: ReactionPayload | null }) {
  const [floating, setFloating] = useState<Floating[]>([]);

  useEffect(() => {
    if (!incoming) return;
    const item: Floating = {
      ...incoming,
      id: Date.now() + Math.random(),
      left: 5 + Math.random() * 85,
      delay: Math.random() * 0.3,
    };
    setFloating((prev) => [...prev.slice(-24), item]);
    const timer = setTimeout(
      () => setFloating((prev) => prev.filter((f) => f.id !== item.id)),
      4200,
    );
    return () => clearTimeout(timer);
  }, [incoming]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden" aria-hidden>
      {floating.map((f) => {
        const Icon = ICONS[f.reaction] ?? Music2;
        return (
          <span
            key={f.id}
            className="animate-float-up absolute bottom-0 flex flex-col items-center gap-1"
            style={{ left: `${f.left}%`, animationDelay: `${f.delay}s` }}
          >
            <Icon className={`h-12 w-12 ${COLORS[f.reaction] ?? 'text-brand-500'}`} />
            <span className="font-mono text-xs uppercase tracking-wide text-slate-100/80">
              {f.alias}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/** Botonera de reacciones para quien juega. */
export function ReactionBar({ onReact }: { onReact: (reaction: Reaction) => void }) {
  return (
    <div className="flex justify-between gap-1.5">
      {REACTIONS.map((reaction) => {
        const Icon = ICONS[reaction];
        return (
          <button
            key={reaction}
            onClick={() => onReact(reaction)}
            aria-label={LABELS[reaction]}
            title={LABELS[reaction]}
            className="flex flex-1 items-center justify-center rounded border-2 border-slate-200 bg-slate-50 py-2 transition active:translate-y-0.5 hover:border-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-100"
          >
            <Icon className={`h-5 w-5 ${COLORS[reaction]}`} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
