'use client';

import { use, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api';
import { useRoom } from '@/hooks/use-room';
import { useRoundAudio } from '@/hooks/use-round-audio';
import { Leaderboard } from '@/components/leaderboard';
import { PodiumCeremony } from '@/components/podium';

type HostSession = { roomId: string; mode: string; token: string };

/** Vista para proyector: tipografía grande, lobby con QR, ronda y ranking. */
export default function ScreenPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const [session, setSession] = useState<HostSession | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<HostSession>(`/rooms/${code}/host-session`, { method: 'POST' })
      .then(setSession)
      .catch(() => setError('Inicia sesión como anfitrión para abrir la pantalla'));
  }, [code]);

  const room = useRoom(session?.token ?? null);
  const isProjector = session?.mode === 'PROJECTOR';
  useRoundAudio(room.socket, room.prepare, room.schedule, {
    enabled: audioEnabled && isProjector,
    paused: room.paused,
  });

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-2xl text-accent-500">{error}</p>
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

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-8 py-10 text-center">
      {state?.status === 'LOBBY' && (
        <>
          <h1 className="text-5xl font-black">{state.gameName}</h1>
          <p className="text-2xl text-slate-500 dark:text-slate-300">
            Entra en <span className="font-bold text-brand-600">{joinUrl}</span>
          </p>
          <div className="flex items-center gap-10">
            <div className="rounded-2xl bg-white p-5">
              <QRCodeSVG value={joinUrl} size={260} />
            </div>
            <div>
              <p className="text-xl text-slate-400">Código</p>
              <p className="text-8xl font-black tracking-[0.15em] text-brand-600 dark:text-brand-400">
                {code}
              </p>
              <p className="mt-4 text-3xl">
                👥 {players.length} jugador{players.length === 1 ? '' : 'es'}
              </p>
            </div>
          </div>
          {isProjector && !audioEnabled && (
            <button
              onClick={() => {
                setAudioEnabled(true);
                room.socket?.emit('audio:enabled');
              }}
              className="btn-primary text-2xl"
            >
              🔊 Activar sonido del proyector
            </button>
          )}
          <div className="flex max-w-3xl flex-wrap justify-center gap-3">
            {players.map((p) => (
              <span
                key={p.id}
                className="rounded-full bg-brand-100 px-4 py-2 text-xl font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200"
              >
                {p.alias}
              </span>
            ))}
          </div>
        </>
      )}

      {state && state.status !== 'LOBBY' && (
        <>
          {room.revealed ? (
            <div>
              <p className="text-2xl uppercase tracking-widest text-slate-400">La canción era</p>
              <p className="mt-2 text-7xl font-black">{room.revealed.title}</p>
              <p className="mt-2 text-4xl text-slate-500 dark:text-slate-300">
                {room.revealed.artist}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-3xl uppercase tracking-widest text-slate-400">
                Ronda {(room.prepare?.index ?? 0) + 1} / {room.prepare?.totalRounds ?? '…'}
              </p>
              <p className="mt-6 text-8xl">{room.paused ? '⏸️' : '🎵'}</p>
              <p className="mt-4 text-3xl font-semibold">
                {room.paused ? 'Pausa' : '¿Qué canción suena?'}
              </p>
            </div>
          )}
          <div className="w-full max-w-2xl text-left text-xl">
            <Leaderboard entries={room.leaderboard.slice(0, 8)} />
          </div>
        </>
      )}
    </main>
  );
}
