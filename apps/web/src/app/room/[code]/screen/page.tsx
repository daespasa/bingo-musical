'use client';

import { use, useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Pause, Users, Volume2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useRoom } from '@/hooks/use-room';
import { ReactionLayer } from '@/components/reactions';
import { RoundSummary } from '@/components/round-summary';
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
  // El texto puede repetirse entre opciones: solo sirve como key si es único
  // dentro de esta pregunta (mismo criterio que en `quiz-options.tsx`).
  const questionHasDuplicateTexts = room.question
    ? new Set(room.question.options.map((o) => o.text)).size !== room.question.options.length
    : false;

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
      <ReactionLayer incoming={room.lastReaction} />
      {state?.status === 'LOBBY' && (
        <>
          <h1 className="text-5xl font-black">{state.gameName}</h1>
          <p className="text-2xl text-slate-500 dark:text-slate-300">
            Entra en <span className="font-bold text-brand-600">{joinUrl}</span>
          </p>
          <div className="flex items-center gap-10">
            <div className="rounded-md bg-white p-5">
              <QRCodeSVG value={joinUrl} size={260} />
            </div>
            <div>
              <p className="text-xl text-slate-400">Código</p>
              <p className="text-8xl font-black tracking-[0.15em] text-brand-600 dark:text-brand-400">
                {code}
              </p>
              <p className="mt-4 flex items-center justify-center gap-2 text-3xl">
                <Users className="h-7 w-7" aria-hidden />
                {players.length} jugador{players.length === 1 ? '' : 'es'}
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
              <Volume2 className="h-6 w-6" aria-hidden />
              Activar sonido del proyector
            </button>
          )}
          <div className="flex max-w-3xl flex-wrap justify-center gap-3">
            {players.map((p) => (
              <span
                key={p.id}
                className="animate-rise rounded-full bg-brand-100 px-4 py-2 text-xl font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200"
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
            <div className="animate-rise">
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
              {/*
               * Bingo clásico: la canción va identificada en el proyector desde
               * el primer segundo, que es lo que permite jugar a quien no la
               * reconoce de oído.
               */}
              {room.nowPlaying && (
                <div className="mt-4">
                  <p className="text-6xl font-black leading-tight">{room.nowPlaying.title}</p>
                  <p className="mt-2 text-3xl text-slate-500 dark:text-slate-300">
                    {room.nowPlaying.artist}
                  </p>
                </div>
              )}
              {/*
               * La pregunta y sus opciones se proyectan a tamaño de sala. Cuál
               * es la correcta no está aquí: el proyector recibe la misma
               * pregunta despojada que los jugadores.
               */}
              {room.question && (
                <div className="mx-auto mt-6 max-w-4xl">
                  <p className="font-display text-4xl leading-tight">{room.question.prompt}</p>
                  <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                    {room.question.options.map((option, index) => {
                      const correcto = room.distribution?.correctIndex === index;
                      return (
                        <li
                          key={questionHasDuplicateTexts ? index : option.text}
                          className={
                            'flex items-center gap-3 rounded-md border-2 px-4 py-3 text-left text-2xl ' +
                            (room.distribution
                              ? correcto
                                ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-900/40'
                                : 'border-slate-300 opacity-60 dark:border-slate-700'
                              : 'border-slate-900 dark:border-slate-700')
                          }
                        >
                          <span className="data shrink-0 rounded border-2 border-current px-2 py-0.5 text-lg">
                            {['A', 'B', 'C', 'D'][index]}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold leading-tight">{option.text}</span>
                            {option.subtitle && (
                              <span className="block text-xl leading-tight text-slate-500 dark:text-slate-400">
                                {option.subtitle}
                              </span>
                            )}
                          </span>
                          {room.distribution && (
                            <span className="data shrink-0 text-xl">
                              {room.distribution.counts[index] ?? 0}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {room.answerProgress && !room.distribution && (
                    <p className="data mt-4 text-2xl text-slate-500 dark:text-slate-400">
                      {room.answerProgress.answeredCount} / {room.answerProgress.totalPlayers} han
                      respondido
                    </p>
                  )}
                </div>
              )}
              {room.paused ? (
                <Pause className="mx-auto mt-6 h-24 w-24 text-slate-400" aria-hidden />
              ) : (
                <div className="mx-auto mt-6 flex items-center gap-6">
                  <div className="vinyl animate-spin-record w-28 shrink-0" aria-hidden />
                  {/* Ecualizador: da sensación de sonido en una pantalla muda */}
                  <div className="flex h-24 items-end gap-2" aria-hidden>
                    {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                      <span
                        key={bar}
                        className="animate-equalize w-3 rounded-sm bg-brand-600"
                        style={{
                          height: `${45 + ((bar * 37) % 55)}%`,
                          animationDelay: `${bar * 90}ms`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
              <p className="mt-4 text-3xl font-semibold">
                {room.paused ? 'Pausa' : '¿Qué canción suena?'}
              </p>
            </div>
          )}
          {room.roundResults && (
            <div className="w-full max-w-2xl text-left">
              <RoundSummary results={room.roundResults} guessEvaluation={room.guessEvaluation} />
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
