'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type {
  BaseRealtimeEvent,
  CardUpdatedPayload,
  ClaimResultPayload,
  GameFinishedPayload,
  HighlightPayload,
  LeaderboardEntry,
  MarkCellAck,
  CellView,
  RoomStatePayload,
  RoundPreparePayload,
  RoundRevealedPayload,
  RoundSchedulePayload,
  ReactionPayload,
  RoundResultsPayload,
  Reaction,
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
  /**
   * Canción identificada mientras suena, en bingo clásico. Es distinto de
   * `revealed`: aquí no se está desvelando nada, se está buscando en el cartón.
   */
  nowPlaying: { title: string; artist: string } | null;
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
  /** Última reacción recibida, para que la proyección la haga flotar. */
  lastReaction: ReactionPayload | null;
  /** Resumen de la ronda que acaba de terminar. */
  roundResults: RoundResultsPayload | null;
  react: (reaction: Reaction) => void;
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
  const [lastReaction, setLastReaction] = useState<ReactionPayload | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResultsPayload | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [schedule, setSchedule] = useState<RoundSchedulePayload | null>(null);
  const [prepare, setPrepare] = useState<RoundPreparePayload | null>(null);
  const [revealed, setRevealed] = useState<RoundRevealedPayload | null>(null);
  const [nowPlaying, setNowPlaying] = useState<{ title: string; artist: string } | null>(null);
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
          // Al reconectar a media ronda de bingo clásico, la canción vuelve a
          // verse: sin esto, quien recarga se queda buscando a ciegas.
          if (s.settings.revealMode === 'VISIBLE_FROM_START') {
            setNowPlaying(s.round?.revealed ?? null);
          }
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
        setNowPlaying(d.revealed);
        setRevealed(null);
        setSchedule(null);
        setLastClaim(null);
        setAwaitingReveal(false);
        setRoundResults(null);
        // Los fallos pertenecen a la ronda que acaba: esas canciones siguen
        // vivas y hay que poder marcarlas cuando les toque sonar.
        setState((prev) =>
          prev?.card
            ? {
                ...prev,
                card: {
                  ...prev.card,
                  cells: prev.card.cells.map((c) =>
                    c.status === 'INVALID' ? { ...c, status: 'UNMARKED' } : c,
                  ),
                },
              }
            : prev,
        );
      }),
    );
    socket.on(
      'reaction:sent',
      p<ReactionPayload>((d) => setLastReaction(d)),
    );
    socket.on(
      'round:results',
      p<RoundResultsPayload>((d) => setRoundResults(d)),
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
    socket.on(
      'card:updated',
      p<CardUpdatedPayload>((d) => {
        setState((prev) =>
          prev?.card
            ? {
                ...prev,
                card: {
                  ...prev.card,
                  cells: prev.card.cells.map((c) =>
                    c.id === d.cellId ? { ...c, status: d.status } : c,
                  ),
                },
              }
            : prev,
        );
      }),
    );
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

  const applyCellStatus = useCallback((cellId: string, status: CellView['status']) => {
    setState((prev) =>
      prev?.card
        ? {
            ...prev,
            card: {
              ...prev.card,
              cells: prev.card.cells.map((c) => (c.id === cellId ? { ...c, status } : c)),
            },
          }
        : prev,
    );
  }, []);

  const react = useCallback((reaction: Reaction) => {
    socketRef.current?.emit('player:react', { reaction });
  }, []);

  const markCell = useCallback(
    (cellId: string): Promise<MarkCellAck> => {
      return new Promise((resolve) => {
        const socket = socketRef.current;
        if (!socket) return resolve({ ok: false, message: 'Sin conexión' });
        socket.timeout(5000).emit('card:mark', { cellId }, (err: unknown, ack: MarkCellAck) => {
          const result: MarkCellAck = err ? { ok: false, message: 'Tiempo agotado' } : ack;
          // El servidor decide; el cliente solo refleja su veredicto
          if (result.ok && result.status) applyCellStatus(cellId, result.status);
          resolve(result);
        });
      });
    },
    [applyCellStatus],
  );

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
    nowPlaying,
    finished,
    lastClaim,
    acceptedClaims,
    highlights,
    paused,
    awaitingReveal,
    socket: socketRef.current,
    markCell,
    lastReaction,
    roundResults,
    react,
    claim,
  };
}
