import clsx from 'clsx';
import { Flame, Medal, Trophy } from 'lucide-react';
import type { LeaderboardEntry } from '@bingo/shared';

function PositionBadge({ position }: { position: number }) {
  if (position === 1) {
    return <Trophy className="h-4 w-4 text-amber-500" aria-hidden />;
  }
  if (position === 2) {
    return <Medal className="h-4 w-4 text-slate-400" aria-hidden />;
  }
  if (position === 3) {
    return <Medal className="h-4 w-4 text-orange-600" aria-hidden />;
  }
  return <span className="text-xs tabular-nums text-slate-400">{position}</span>;
}

export function Leaderboard({
  entries,
  highlightId,
}: {
  entries: LeaderboardEntry[];
  highlightId?: string;
}) {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">Sin puntuaciones todavía.</p>;
  }
  return (
    <ol className="flex flex-col gap-1">
      {entries.map((e) => (
        <li
          key={e.participantId}
          className={clsx(
            'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
            e.participantId === highlightId
              ? 'bg-brand-100 font-semibold dark:bg-brand-900/40'
              : 'bg-slate-100/60 dark:bg-slate-800/60',
          )}
        >
          <span className="flex items-center gap-2">
            <span className="flex w-5 justify-center">
              <PositionBadge position={e.position} />
            </span>
            <span className="sr-only">Posición {e.position}:</span>
            {e.alias}
            {e.streak >= 3 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-500">
                <Flame className="h-3.5 w-3.5" aria-hidden />
                <span className="sr-only">Racha de </span>
                {e.streak}
              </span>
            )}
          </span>
          <span className="font-mono font-semibold tabular-nums">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
