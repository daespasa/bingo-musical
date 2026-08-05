'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  BaseRealtimeEvent,
  ClaimResultPayload,
  GameFinishedPayload,
  HighlightPayload,
  LeaderboardEntry,
  MarkCellAck,
  RoomStatePayload,
  RoundPreparePayload,
  RoundRevealedPayload,
  RoundSchedulePayload,
} from '@bingo/shared';
import { createRoomSocket } from '@/lib/socket';

export type RoomConnection = {
  connected: boolean;
  authFailed: boolean;
  state: RoomStatePayload | null;
  leaderboard: LeaderboardEntry[];
  schedule: RoundSchedulePayload | null;
  prepare: RoundPreparePayload | null;
  revealed: RoundRevealedPayload | null;
  finished: GameFinishedPayload | null;
  lastClaim: ClaimResultPayload | null;
  /** Reclamaciones aceptadas de la partida, en orden de llegada. */
  acceptedClaims: ClaimResultPayload[];
  highlights: HighlightPayload[];
  paused: boolean;
  /** El fragmento terminó y el anfitrión aún no ha revelado (modo manual). */
  awaitingReveal: boolean;
  socket: Socket | null;
  markCell: (cellId: string) => Promise<MarkCellAck>;
  claim: (type: 'LINE' | 'BINGO') => Promise<{ accepted: boolean; reason?: string }>;
};

/**
 * Conexión a la sala vía Socket.IO: mantiene estado, ronda programada,
 * reveal, ranking, reclamaciones y final de partida.
 */
export function useRoom(token: string | null): RoomConnection {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [state, setState] = useState<RoomStatePayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schedule, setSchedule] = useState<RoundSchedulePayload | null>(null);
  const [prepare, setPrepare] = useState<RoundPreparePayload | null>(null);
  const [revealed, setRevealed] = useState<RoundRevealedPayload | null>(null);
  const [finished, setFinished] = useState<GameFinishedPayload | null>(null);
  const [lastClaim, setLastClaim] = useState<ClaimResultPayload | null>(null);
  const [acceptedClaims, setAcceptedClaims] = useState<ClaimResultPayload[]>([]);
  const [highlights, setHighlights] = useState<HighlightPayload[]>([]);
  const [paused, setPaused] = useState(false);
  const [awaitingReveal, setAwaitingReveal] = useState(false);

  useEffect(() => {
    if (!token) return;
    const socket = createRoomSocket(token);
    socketRef.current = socket;

    const p = <T>(handler: (payload: T) => void) => {
      return (event: BaseRealtimeEvent<T>) => handler(event.payload);
    };

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('room:error', () => setAuthFailed(true));
    socket.on(
      'room:state',
      p<RoomStatePayload | null>((s) => {
        if (s) {
          setState(s);
          setLeaderboard(s.leaderboard);
          setPaused(s.status === 'PAUSED');
        }
      }),
    );
    socket.on(
      'leaderboard:updated',
      p<{ leaderboard: LeaderboardEntry[] }>((d) => setLeaderboard(d.leaderboard)),
    );
    socket.on(
      'round:prepare',
      p<RoundPreparePayload>((d) => {
        setPrepare(d);
        setRevealed(null);
        setSchedule(null);
        setLastClaim(null);
        setAwaitingReveal(false);
      }),
    );
    socket.on(
      'round:schedule',
      p<RoundSchedulePayload>((d) => setSchedule(d)),
    );
    socket.on(
      'round:revealed',
      p<RoundRevealedPayload>((d) => {
        setRevealed(d);
        setAwaitingReveal(false);
      }),
    );
    socket.on('round:awaiting-reveal', () => setAwaitingReveal(true));
    socket.on('round:skipped', () => setSchedule(null));
    socket.on(
      'game:finished',
      p<GameFinishedPayload>((d) => setFinished(d)),
    );
    socket.on('game:paused', () => setPaused(true));
    socket.on('game:resumed', () => setPaused(false));
    socket.on(
      'claim:accepted',
      p<ClaimResultPayload>((d) => {
        setLastClaim(d);
        setAcceptedClaims((prev) => [...prev, d]);
      }),
    );
    socket.on(
      'claim:rejected',
      p<ClaimResultPayload>((d) => setLastClaim(d)),
    );
    socket.on(
      'highlight:created',
      p<HighlightPayload>((d) => setHighlights((prev) => [...prev, d])),
    );
    // Cambios de participantes → pedir estado fresco es innecesario;
    // el estado completo llega en reconexión y room:state se refresca en hitos.
    socket.on(
      'room:participant-updated',
      p<{ id: string; audioStatus?: string }>((d) => {
        setState((prev) =>
          prev
            ? {
                ...prev,
                participants: prev.participants.map((x) =>
                  x.id === d.id
                    ? { ...x, audioStatus: (d.audioStatus as never) ?? x.audioStatus }
                    : x,
                ),
              }
            : prev,
        );
      }),
    );
    socket.on(
      'room:participant-joined',
      p<{ id: string; alias: string; role: 'HOST' | 'PLAYER' | 'SCREEN' }>((d) => {
        setState((prev) => {
          if (!prev || prev.participants.some((x) => x.id === d.id)) return prev;
          return {
            ...prev,
            participants: [
              ...prev.participants,
              { ...d, connected: true, audioStatus: 'NOT_ENABLED', score: 0 },
            ],
          };
        });
      }),
    );

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  const markCell = useCallback((cellId: string): Promise<MarkCellAck> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, message: 'Sin conexión' });
      socket.timeout(5000).emit('card:mark', { cellId }, (err: unknown, ack: MarkCellAck) => {
        resolve(err ? { ok: false, message: 'Tiempo agotado' } : ack);
      });
    });
  }, []);

  const claim = useCallback((type: 'LINE' | 'BINGO') => {
    return new Promise<{ accepted: boolean; reason?: string }>((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ accepted: false, reason: 'Sin conexión' });
      const event = type === 'LINE' ? 'claim:line' : 'claim:bingo';
      socket
        .timeout(5000)
        .emit(event, {}, (err: unknown, ack: { accepted: boolean; reason?: string }) => {
          resolve(err ? { accepted: false, reason: 'Tiempo agotado' } : ack);
        });
    });
  }, []);

  return {
    connected,
    authFailed,
    state,
    leaderboard,
    schedule,
    prepare,
    revealed,
    finished,
    lastClaim,
    acceptedClaims,
    highlights,
    paused,
    awaitingReveal,
    socket: socketRef.current,
    markCell,
    claim,
  };
}
