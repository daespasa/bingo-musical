'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { RoundPreparePayload, RoundSchedulePayload } from '@bingo/shared';

/**
 * Reproducción sincronizada: precarga en round:prepare (confirmando por
 * socket), reproduce en el startsAt común y detiene al agotar duration.
 */
export function useRoundAudio(
  socket: Socket | null,
  prepare: RoundPreparePayload | null,
  schedule: RoundSchedulePayload | null,
  options: { enabled: boolean; paused: boolean },
): { playing: boolean; audioError: string | null } {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Precarga
  useEffect(() => {
    if (!options.enabled || !prepare) return;
    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.src = prepare.previewUrl;
    audio.preload = 'auto';
    const onReady = () => socket?.emit('audio:preload-status', { ready: true });
    const onError = () => {
      setAudioError('No se pudo cargar el audio');
      socket?.emit('audio:error', { message: 'preload failed' });
    };
    audio.addEventListener('canplaythrough', onReady, { once: true });
    audio.addEventListener('error', onError, { once: true });
    audio.load();
    return () => {
      audio.removeEventListener('canplaythrough', onReady);
      audio.removeEventListener('error', onError);
    };
  }, [prepare, options.enabled, socket]);

  // Reproducción programada
  useEffect(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    const audio = audioRef.current;
    if (!options.enabled || !schedule || !audio) return;
    if (options.paused) {
      audio.pause();
      setPlaying(false);
      return;
    }
    const delay = Math.max(0, schedule.startsAt - schedule.serverTimestamp);
    const stopAt = delay + schedule.durationMs;
    timersRef.current.push(
      setTimeout(() => {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            setPlaying(true);
            socket?.emit('audio:started', { roundId: schedule.roundId, at: Date.now() });
          })
          .catch((err: unknown) => {
            setAudioError('Reproducción bloqueada por el navegador');
            socket?.emit('audio:error', { message: String(err).slice(0, 100) });
          });
      }, delay),
      setTimeout(() => {
        audio.pause();
        setPlaying(false);
      }, stopAt),
    );
    return () => {
      for (const t of timersRef.current) clearTimeout(t);
      audio.pause();
      setPlaying(false);
    };
  }, [schedule, options.enabled, options.paused, socket]);

  return { playing, audioError };
}
