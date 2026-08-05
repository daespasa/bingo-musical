'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { api, ApiError } from '@/lib/api';
import { useRoom } from '@/hooks/use-room';
import { useRoundAudio } from '@/hooks/use-round-audio';
import { Leaderboard } from '@/components/leaderboard';
import { RoundStatus } from '@/components/round-status';
import { PodiumCeremony } from '@/components/podium';

type HostSession = {
  roomId: string;
  code: string;
  mode: string;
  participantId: string;
  token: string;
};

export default function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [session, setSession] = useState<HostSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);

  useEffect(() => {
    api<HostSession>(`/rooms/${code}/host-session`, { method: 'POST' })
      .then(setSession)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : 'No se pudo abrir la sesión de anfitrión'),
      );
  }, [code]);

  const room = useRoom(session?.token ?? null);
  const isProjector = session?.mode === 'PROJECTOR';
  const audio = useRoundAudio(room.socket, room.prepare, room.schedule, {
    enabled: audioEnabled && isProjector,
    paused: room.paused,
  });

  const emit = (event: string, body: Record<string, unknown> = {}) => {
    room.socket?.emit(event, body);
  };

  if (error) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-accent-500">{error}</p>
        <Link href="/dashboard" className="btn-secondary">
          Volver al dashboard
        </Link>
      </main>
    );
  }

  if (room.finished) {
    return <PodiumCeremony finished={room.finished} code={code} />;
  }

  const state = room.state;
  const joinUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/join/${code}` : `/join/${code}`;
  const players = state?.participants.filter((p) => p.role === 'PLAYER') ?? [];
  const inLobby = state?.status === 'LOBBY';

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">Panel del anfitrión</p>
          <h1 className="text-xl font-bold">{state?.gameName ?? '…'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/room/${code}/screen`} target="_blank" className="btn-secondary text-xs">
            📽️ Abrir pantalla proyector
          </Link>
          {!room.connected && (
            <span className="animate-pulse rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              Reconectando…
            </span>
          )}
        </div>
      </header>

      {inLobby && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="card flex flex-col items-center gap-4 p-6 text-center">
            <p className="text-sm text-slate-500 dark:text-slate-400">Únete en {joinUrl}</p>
            <p className="text-5xl font-black tracking-[0.2em] text-brand-600 dark:text-brand-400">
              {code}
            </p>
            <div className="rounded-xl bg-white p-3">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            {isProjector && !audioEnabled && (
              <button
                onClick={() => {
                  setAudioEnabled(true);
                  emit('audio:enabled');
                }}
                className="btn-primary"
              >
                🔊 Activar sonido en este dispositivo
              </button>
            )}
          </div>
          <div className="card p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">Jugadores ({players.length})</h2>
              <button
                onClick={() => emit('host:lock', { locked: !state?.locked })}
                className="btn-secondary px-3 py-1 text-xs"
              >
                {state?.locked ? '🔓 Desbloquear sala' : '🔒 Bloquear sala'}
              </button>
            </div>
            {players.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Aún no hay jugadores. Comparte el código o el QR.
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-slate-100/60 px-3 py-2 text-sm dark:bg-slate-800/60"
                >
                  <span>
                    {p.connected ? '🟢' : '⚪'} {p.alias}{' '}
                    <span title="Estado del audio">
                      {p.audioStatus === 'READY' ? '🔊' : p.audioStatus === 'ERROR' ? '🔇' : '…'}
                    </span>
                  </span>
                  <button
                    onClick={() => emit('host:kick', { participantId: p.id })}
                    className="text-xs text-accent-500 hover:underline"
                  >
                    Expulsar
                  </button>
                </li>
              ))}
            </ul>
            <button
              onClick={() => emit('host:start')}
              disabled={players.length === 0}
              className="btn-primary mt-4 w-full text-lg"
            >
              🚀 Empezar partida
            </button>
          </div>
        </div>
      )}

      {state && !inLobby && (
        <>
          <RoundStatus
            schedule={room.schedule}
            prepare={room.prepare}
            revealed={room.revealed}
            paused={room.paused}
            playing={audio.playing}
            audioError={audio.audioError}
          />
          <div className="card flex flex-wrap justify-center gap-2 p-4">
            {room.paused ? (
              <button onClick={() => emit('host:resume')} className="btn-primary">
                ▶️ Reanudar
              </button>
            ) : (
              <button onClick={() => emit('host:pause')} className="btn-secondary">
                ⏸️ Pausar
              </button>
            )}
            <button onClick={() => emit('host:replay')} className="btn-secondary">
              🔁 Repetir fragmento
            </button>
            <button
              onClick={() => emit('host:add-time', { extraMs: 10000 })}
              className="btn-secondary"
            >
              ⏱️ +10 s
            </button>
            <button onClick={() => emit('host:reveal')} className="btn-secondary">
              👁️ Revelar
            </button>
            <button onClick={() => emit('host:skip')} className="btn-secondary">
              ⏭️ Omitir canción
            </button>
            <button onClick={() => emit('host:next')} className="btn-primary">
              ➡️ Siguiente canción
            </button>
            <button
              onClick={() => {
                if (confirm('¿Terminar la partida para todos?')) emit('host:end');
              }}
              className="btn-danger"
            >
              🏁 Finalizar
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Ranking en vivo
              </h2>
              <Leaderboard entries={room.leaderboard} />
            </section>
            <section className="card p-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
                Jugadores ({players.length})
              </h2>
              <ul className="flex flex-col gap-1 text-sm">
                {players.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-2 py-1">
                    <span>
                      {p.connected ? '🟢' : '⚪'} {p.alias}
                    </span>
                    <button
                      onClick={() => emit('host:kick', { participantId: p.id })}
                      className="text-xs text-accent-500 hover:underline"
                    >
                      Expulsar
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
