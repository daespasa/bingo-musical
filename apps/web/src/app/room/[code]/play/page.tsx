'use client';

import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CheckCircle2,
  Loader2,
  Megaphone,
  MonitorPlay,
  PartyPopper,
  Trophy,
  Volume2,
  XCircle,
} from 'lucide-react';
import { loadGuestSession } from '@/lib/types';
import { useRoom } from '@/hooks/use-room';
import { useRoundAudio } from '@/hooks/use-round-audio';
import { BingoCardGrid } from '@/components/bingo-card';
import { ReactionBar } from '@/components/reactions';
import { RoundSummary } from '@/components/round-summary';
import { Leaderboard } from '@/components/leaderboard';
import { RoundStatus } from '@/components/round-status';
import { PodiumCeremony } from '@/components/podium';

/** WAV silencioso mínimo: desbloquea el autoplay tras un gesto del usuario. */
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YQAAAAA=';

type Toast = { text: string; tone: 'success' | 'error' | 'info' };

export default function PlayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [noSession, setNoSession] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

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
    if (!room.lastClaim) return;
    const c = room.lastClaim;
    const mine = c.participantId === participantId;
    let next: Toast | null = null;
    if (c.accepted) {
      next = {
        text: mine
          ? `¡Has cantado ${c.type === 'LINE' ? 'LÍNEA' : 'BINGO'}!`
          : `${c.alias} ha cantado ${c.type === 'LINE' ? 'línea' : 'BINGO'}`,
        tone: 'success',
      };
    } else if (mine) {
      next = { text: c.reason ?? 'Reclamación rechazada', tone: 'error' };
    }
    if (!next) return;
    setToast(next);
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [room.lastClaim, participantId]);

  const myEntry = useMemo(
    () => room.leaderboard.find((e) => e.participantId === participantId),
    [room.leaderboard, participantId],
  );

  /** Filas y bingo confirmados por el servidor para este jugador. */
  const { myLineRows, myBingo } = useMemo(() => {
    const mine = room.acceptedClaims.filter((c) => c.participantId === participantId);
    return {
      myLineRows: mine.filter((c) => c.type === 'LINE').flatMap((c) => c.rows ?? []),
      myBingo: mine.some((c) => c.type === 'BINGO'),
    };
  }, [room.acceptedClaims, participantId]);

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
        <p className="text-rose-500">Tu sesión ha caducado o fuiste expulsado.</p>
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
  const players = state?.participants.filter((p) => p.role === 'PLAYER') ?? [];

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col gap-4 px-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-5">
      <header className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            Sala <span className="text-slate-900 dark:text-slate-100">{code}</span>
          </p>
          <h1 className="truncate font-display text-lg leading-tight">{state?.gameName ?? '…'}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-sm">
          {!room.connected && (
            <span className="flex items-center gap-1 rounded border-2 border-amber-500 bg-amber-200 px-2 py-1 font-mono text-xs uppercase tracking-wide text-amber-700 dark:bg-amber-700 dark:text-amber-200">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Reconectando…
            </span>
          )}
          {myEntry && (
            <span
              aria-label="Tu puntuación"
              className="data rounded border-2 border-slate-900 bg-brand-600 px-3 py-1 font-medium text-slate-50 dark:border-slate-100"
            >
              {myEntry.score}
            </span>
          )}
        </div>
      </header>

      {toast && (
        <div
          role="status"
          className={`animate-toast flex items-center justify-center gap-2 rounded border-2 border-slate-900 px-4 py-3 text-center font-display text-sm uppercase tracking-wide text-slate-50 shadow-sleeve dark:border-slate-100 ${
            toast.tone === 'success'
              ? 'bg-emerald-500'
              : toast.tone === 'error'
                ? 'bg-rose-500'
                : 'bg-slate-900 dark:bg-slate-700'
          }`}
        >
          {toast.tone === 'success' ? (
            <PartyPopper className="h-4 w-4" aria-hidden />
          ) : (
            <XCircle className="h-4 w-4" aria-hidden />
          )}
          {toast.text}
        </div>
      )}

      {state?.status === 'LOBBY' && (
        <div className="card flex flex-col items-center gap-4 p-8 text-center">
          {/* Disco parado: la partida aún no ha arrancado */}
          <div className="vinyl w-20" aria-hidden />
          <p className="font-display text-lg leading-tight">
            Esperando a que el anfitrión empiece…
          </p>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
            {players.length} jugadores en la sala
          </p>
          {isRemote && !audioEnabled && (
            <button
              onClick={() => {
                void new Audio(SILENT_WAV).play().catch(() => undefined);
                setAudioEnabled(true);
                room.socket?.emit('audio:enabled');
              }}
              className="btn-primary text-lg"
            >
              <Volume2 className="h-5 w-5" aria-hidden />
              Activar sonido
            </button>
          )}
          {(audioEnabled || !isRemote) && (
            <p className="flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400">
              {isRemote ? (
                <>
                  <CheckCircle2 className="h-4 w-4" aria-hidden />
                  Sonido listo
                </>
              ) : (
                <>
                  <MonitorPlay className="h-4 w-4" aria-hidden />
                  El audio suena en el proyector
                </>
              )}
            </p>
          )}
        </div>
      )}

      {state && state.status !== 'LOBBY' && (
        <>
          <RoundStatus
            schedule={room.schedule}
            revealed={room.revealed}
            nowPlaying={room.nowPlaying}
            paused={room.paused}
            playing={audio.playing}
            audioError={audio.audioError}
            prepare={room.prepare}
          />
          {state.card && (
            <BingoCardGrid
              card={state.card}
              disabled={!room.connected || room.paused}
              lineRows={myLineRows}
              bingo={myBingo}
              onMark={(cellId) => void room.markCell(cellId)}
            />
          )}
          <div className="flex gap-3">
            {state.settings.lineEnabled && (
              <button
                onClick={() => void room.claim('LINE')}
                className="btn-secondary flex-1 text-base"
              >
                <Megaphone className="h-4 w-4" aria-hidden />
                ¡Línea!
              </button>
            )}
            {state.settings.bingoEnabled && (
              <button
                onClick={() => void room.claim('BINGO')}
                className="btn-primary flex-1 text-base"
              >
                <Trophy className="h-4 w-4" aria-hidden />
                ¡Bingo!
              </button>
            )}
          </div>
          {room.roundResults && <RoundSummary results={room.roundResults} />}

          <section className="card p-3">
            <h2 className="eyebrow mb-2">Anima a la sala</h2>
            <ReactionBar onReact={(reaction) => room.react(reaction)} />
          </section>

          {state.settings.showLeaderboard && (
            <section className="card p-4">
              <h2 className="eyebrow mb-3">Ranking</h2>
              <Leaderboard entries={room.leaderboard} highlightId={participantId ?? undefined} />
            </section>
          )}
        </>
      )}
    </main>
  );
}
