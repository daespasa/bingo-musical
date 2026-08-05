import clsx from 'clsx';
import type { LeaderboardEntry } from '@bingo/shared';

const MEDALS = ['🥇', '🥈', '🥉'];

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
            'flex items-center justify-between rounded-lg px-3 py-2 text-sm',
            e.participantId === highlightId
              ? 'bg-brand-100 font-semibold dark:bg-brand-900/40'
              : 'bg-slate-100/60 dark:bg-slate-800/60',
          )}
        >
          <span className="flex items-center gap-2">
            <span className="w-6 text-center">{MEDALS[e.position - 1] ?? e.position}</span>
            {e.alias}
            {e.streak >= 3 && <span title={`Racha de ${e.streak}`}>🔥</span>}
          </span>
          <span className="font-mono font-semibold">{e.score}</span>
        </li>
      ))}
    </ol>
  );
}
