'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRight,
  Circle,
  Eye,
  Flag,
  Loader2,
  Lock,
  LockOpen,
  MonitorPlay,
  Pause,
  Play,
  Repeat,
  Rocket,
  SkipForward,
  TimerReset,
  UserX,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import clsx from 'clsx';
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

function AudioBadge({ status }: { status: string }) {
  if (status === 'READY') {
    return <Volume2 className="h-3.5 w-3.5 text-emerald-500" aria-label="Sonido listo" />;
  }
  if (status === 'ERROR') {
    return <VolumeX className="h-3.5 w-3.5 text-accent-500" aria-label="Error de sonido" />;
  }
  return <Volume2 className="h-3.5 w-3.5 text-slate-300" aria-label="Sonido sin activar" />;
}

export default function HostPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [session, setSession] = useState<HostSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

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
  const autoReveal = state?.settings.autoReveal ?? true;
  // La pista depende del modo: en una partida sin cartones, preguntar «¿la
  // tienes en el cartón?» no significa nada.
  const roundHint =
    state?.gameMode === 'MULTIPLE_CHOICE'
      ? 'Elige la respuesta correcta'
      : state?.gameMode === 'FREE_TEXT'
        ? 'Escribe lo que estás escuchando'
        : '¿La tienes en el cartón?';

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Panel del anfitrión</p>
          <h1 className="text-xl font-bold">{state?.gameName ?? '…'}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/room/${code}/screen`} target="_blank" className="btn-secondary text-xs">
            <MonitorPlay className="h-4 w-4" aria-hidden />
            Abrir pantalla proyector
          </Link>
          {!room.connected && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-700 dark:bg-amber-900 dark:text-amber-200">
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
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
            <div className="rounded-md bg-white p-3">
              <QRCodeSVG value={joinUrl} size={180} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Wand2 className="h-3.5 w-3.5" aria-hidden />
              {autoReveal
                ? state?.settings.autoAdvance
                  ? 'Revelado y avance automáticos'
                  : 'Revelado automático'
                : 'Revelado manual'}
            </p>
            {isProjector && !audioEnabled && (
              <button
                onClick={() => {
                  setAudioEnabled(true);
                  emit('audio:enabled');
                }}
                className="btn-primary"
              >
                <Volume2 className="h-4 w-4" aria-hidden />
                Activar sonido en este dispositivo
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
                {state?.locked ? (
                  <>
                    <LockOpen className="h-3.5 w-3.5" aria-hidden />
                    Desbloquear sala
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" aria-hidden />
                    Bloquear sala
                  </>
                )}
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
                  className="animate-toast flex items-center justify-between rounded-lg bg-slate-100/60 px-3 py-2 text-sm dark:bg-slate-800/60"
                >
                  <span className="flex items-center gap-2">
                    <Circle
                      className={clsx(
                        'h-2.5 w-2.5',
                        p.connected ? 'fill-emerald-500 text-emerald-500' : 'text-slate-300',
                      )}
                      aria-label={p.connected ? 'Conectado' : 'Desconectado'}
                    />
                    {p.alias}
                    <AudioBadge status={p.audioStatus} />
                  </span>
                  <button
                    onClick={() => emit('host:kick', { participantId: p.id })}
                    className="flex items-center gap-1 text-xs text-accent-500 hover:underline"
                  >
                    <UserX className="h-3.5 w-3.5" aria-hidden />
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
              <Rocket className="h-5 w-5" aria-hidden />
              Empezar partida
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
            nowPlaying={room.nowPlaying}
            hint={roundHint}
            paused={room.paused}
            playing={audio.playing}
            audioError={audio.audioError}
          />
          <div className="card flex flex-wrap justify-center gap-2 p-4">
            {room.paused ? (
              <button onClick={() => emit('host:resume')} className="btn-primary">
                <Play className="h-4 w-4" aria-hidden />
                Reanudar
              </button>
            ) : (
              <button onClick={() => emit('host:pause')} className="btn-secondary">
                <Pause className="h-4 w-4" aria-hidden />
                Pausar
              </button>
            )}
            <button onClick={() => emit('host:replay')} className="btn-secondary">
              <Repeat className="h-4 w-4" aria-hidden />
              Repetir fragmento
            </button>
            <button
              onClick={() => emit('host:add-time', { extraMs: 10000 })}
              className="btn-secondary"
            >
              <TimerReset className="h-4 w-4" aria-hidden />
              +10 s
            </button>
            <button
              onClick={() => emit('host:reveal')}
              className={clsx(
                'btn-secondary',
                room.awaitingReveal && 'animate-line border-amber-400 text-amber-600',
              )}
            >
              <Eye className="h-4 w-4" aria-hidden />
              Revelar
            </button>
            <button onClick={() => emit('host:skip')} className="btn-secondary">
              <SkipForward className="h-4 w-4" aria-hidden />
              Omitir canción
            </button>
            <button onClick={() => emit('host:next')} className="btn-primary">
              <ArrowRight className="h-4 w-4" aria-hidden />
              Siguiente canción
            </button>
            <button onClick={() => setConfirmEnd(true)} className="btn-danger">
              <Flag className="h-4 w-4" aria-hidden />
              Finalizar
            </button>
          </div>

          {/*
           * Confirmación dentro de la aplicación: el `confirm()` del navegador
           * rompe el diseño y en la aplicación instalada se ve como un aviso
           * ajeno, justo en el momento más delicado de la partida.
           */}
          {confirmEnd && (
            <div
              role="alertdialog"
              aria-labelledby="fin-titulo"
              className="animate-toast card flex flex-col gap-3 p-4 text-center"
            >
              <p id="fin-titulo" className="font-display text-lg leading-tight">
                ¿Terminamos la partida?
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Se acabará para todo el mundo y se mostrará la clasificación final.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button onClick={() => setConfirmEnd(false)} className="btn-secondary">
                  Seguir jugando
                </button>
                <button
                  onClick={() => {
                    setConfirmEnd(false);
                    emit('host:end');
                  }}
                  className="btn-danger"
                >
                  Terminar y ver resultados
                </button>
              </div>
            </div>
          )}
          {room.awaitingReveal && (
            <p className="animate-toast text-center text-sm text-amber-600 dark:text-amber-400">
              El fragmento ha terminado. Pulsa <strong>Revelar</strong> cuando quieras mostrar la
              canción.
            </p>
          )}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="card p-4">
              <h2 className="eyebrow mb-3">Ranking en vivo</h2>
              <Leaderboard entries={room.leaderboard} />
            </section>
            <section className="card p-4">
              <h2 className="eyebrow mb-3">Jugadores ({players.length})</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {players.map((p) => (
                  <li key={p.id} className="flex items-center justify-between px-2 py-1">
                    <span className="flex items-center gap-2">
                      <Circle
                        className={clsx(
                          'h-2.5 w-2.5',
                          p.connected ? 'fill-emerald-500 text-emerald-500' : 'text-slate-300',
                        )}
                        aria-label={p.connected ? 'Conectado' : 'Desconectado'}
                      />
                      {p.alias}
                    </span>
                    <button
                      onClick={() => emit('host:kick', { participantId: p.id })}
                      className="flex items-center gap-1 text-xs text-accent-500 hover:underline"
                    >
                      <UserX className="h-3.5 w-3.5" aria-hidden />
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
