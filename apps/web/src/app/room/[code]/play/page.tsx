'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { loadGuestSession } from '@/lib/types';
import { useRoom } from '@/hooks/use-room';
import { useRoundAudio } from '@/hooks/use-round-audio';
import { BingoCardGrid } from '@/components/bingo-card';
import { Leaderboard } from '@/components/leaderboard';
import { RoundStatus } from '@/components/round-status';
import { PodiumCeremony } from '@/components/podium';

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [noSession, setNoSession] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const session = loadGuestSession(code);
    if (!session) {
      setNoSession(true);
      return;
    }
    setToken(session.token);
    setParticipantId(session.participantId);
  }, [code]);

  const room = useRoom(token);
  const isRemote = room.state?.mode !== 'PROJECTOR';
  const audio = useRoundAudio(room.socket, room.prepare, room.schedule, {
    enabled: audioEnabled && isRemote,
    paused: room.paused,
  });

  useEffect(() => {
    if (room.lastClaim) {
      const c = room.lastClaim;
      setToast(
        c.accepted
          ? `🎉 ${c.alias} cantó ${c.type === 'LINE' ? '¡LÍNEA!' : '¡BINGO!'}`
          : c.participantId === participantId
            ? `❌ ${c.reason ?? 'Reclamación rechazada'}`
            : null,
      );
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [room.lastClaim, participantId]);

  const myEntry = useMemo(
    () => room.leaderboard.find((e) => e.participantId === participantId),
    [room.leaderboard, participantId],
  );

  if (noSession) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p>No tienes sesión en esta sala.</p>
        <button onClick={() => router.push(`/join/${code}`)} className="btn-primary">
          Unirse a la sala {code}
        </button>
      </main>
    );
  }

  if (room.authFailed) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-accent-500">Tu sesión ha caducado o fuiste expulsado.</p>
        <Link href={`/join/${code}`} className="btn-primary">
          Volver a entrar
        </Link>
      </main>
    );
  }

  if (room.finished) {
    return (
      <PodiumCeremony
        finished={room.finished}
        highlightId={participantId ?? undefined}
        code={code}
      />
    );
  }

  const state = room.state;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Sala {code}</p>
          <h1 className="font-bold">{state?.gameName ?? '…'}</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {!room.connected && (
            <span className="animate-pulse rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              Reconectando…
            </span>
          )}
          {myEntry && (
            <span className="rounded-full bg-brand-100 px-3 py-1 font-mono font-bold text-brand-700 dark:bg-brand-900 dark:text-brand-300">
              {myEntry.score}
            </span>
          )}
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm font-medium text-white dark:bg-white dark:text-slate-900"
        >
          {toast}
        </div>
      )}

      {state?.status === 'LOBBY' && (
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          <p className="text-4xl" aria-hidden>
            🕺💃
          </p>
          <p className="font-semibold">Esperando a que el anfitrión empiece…</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {state.participants.filter((p) => p.role === 'PLAYER').length} jugadores en la sala
          </p>
          {isRemote && !audioEnabled && (
            <button
              onClick={() => {
                // Desbloquear autoplay con una reproducción silenciosa
                const a = new Audio(
                  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=',
                );
                void a.play().catch(() => undefined);
                setAudioEnabled(true);
                room.socket?.emit('audio:enabled');
              }}
              className="btn-primary text-lg"
            >
              🔊 Activar sonido
            </button>
          )}
          {(audioEnabled || !isRemote) && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {isRemote ? '✅ Sonido listo' : '📽️ El audio suena en el proyector'}
            </p>
          )}
        </div>
      )}

      {state && state.status !== 'LOBBY' && (
        <>
          <RoundStatus
            schedule={room.schedule}
            revealed={room.revealed}
            paused={room.paused}
            playing={audio.playing}
            audioError={audio.audioError}
            prepare={room.prepare}
          />
          {state.card && (
            <BingoCardGrid
              card={state.card}
              disabled={!room.connected || room.paused}
              onMark={(cellId) => void room.markCell(cellId)}
            />
          )}
          <div className="flex gap-3">
            {state.settings.lineEnabled && (
              <button
                onClick={() => void room.claim('LINE')}
                className="btn-secondary flex-1 text-base"
              >
                📣 ¡Línea!
              </button>
            )}
            {state.settings.bingoEnabled && (
              <button
                onClick={() => void room.claim('BINGO')}
                className="btn-primary flex-1 text-base"
              >
                🏆 ¡Bingo!
              </button>
            )}
          </div>
          {state.settings.showLeaderboard && (
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Ranking
              </h2>
              <Leaderboard entries={room.leaderboard} highlightId={participantId ?? undefined} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
