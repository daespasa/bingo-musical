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
  QuizQuestionView,
  QuizAnswerSubmittedPayload,
  QuizDistributionPayload,
  SubmitAnswerAck,
  FreeTextQuestionView,
  GuessEvaluationPayload,
  SubmitTextAnswerAck,
  SurvivalStandingView,
  SurvivalStandingsPayload,
  MyLivesView,
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
  /** Pregunta en curso, sin la solución. */
  question: QuizQuestionView | null;
  /** Qué opción he elegido, si ya he respondido. */
  myAnswer: number | null;
  /** Cuánta gente lleva respondido, para el anfitrión y la proyección. */
  answerProgress: QuizAnswerSubmittedPayload | null;
  /**
   * Si la ronda admite respuestas ya.
   *
   * Las opciones se enseñan en cuanto llegan, pero no se pueden pulsar hasta
   * que la canción arranca: un botón que el servidor va a rechazar es peor que
   * un botón desactivado.
   */
  answersOpen: boolean;
  /** Solución y reparto de respuestas. Solo llega tras cerrar la ronda. */
  distribution: QuizDistributionPayload | null;
  submitAnswer: (optionIndex: number) => Promise<SubmitAnswerAck>;
  /** Enunciado de la ronda de respuesta libre, sin la solución. */
  freeText: FreeTextQuestionView | null;
  /** Intentos ya escritos en esta ronda, en orden. */
  myAttempts: string[];
  /** Cómo se resolvió la ronda escrita. Solo tras el reveal. */
  guessEvaluation: GuessEvaluationPayload | null;
  submitTextAnswer: (text: string) => Promise<SubmitTextAnswerAck>;
  /** Clasificación de vidas. Vacía fuera de Supervivencia. */
  survivalStandings: SurvivalStandingView[];
  /** Mis vidas y si estoy eliminado. Nulo fuera de Supervivencia. */
  myLives: MyLivesView;
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
  const [question, setQuestion] = useState<QuizQuestionView | null>(null);
  const [myAnswer, setMyAnswer] = useState<number | null>(null);
  const [answerProgress, setAnswerProgress] = useState<QuizAnswerSubmittedPayload | null>(null);
  const [distribution, setDistribution] = useState<QuizDistributionPayload | null>(null);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [freeText, setFreeText] = useState<FreeTextQuestionView | null>(null);
  const [myAttempts, setMyAttempts] = useState<string[]>([]);
  const [guessEvaluation, setGuessEvaluation] = useState<GuessEvaluationPayload | null>(null);
  const [survivalStandings, setSurvivalStandings] = useState<SurvivalStandingView[]>([]);
  const [myLives, setMyLives] = useState<MyLivesView>(null);
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
          // Y la pregunta en curso, con la respuesta ya enviada si la había:
          // reconectar no puede servir para responder dos veces.
          setQuestion(s.round?.question ?? null);
          setMyAnswer(s.round?.myAnswer?.optionIndex ?? null);
          setFreeText(s.round?.freeText ?? null);
          setMyAttempts(s.round?.myAttempts ?? []);
          // Las vidas las manda el servidor: reconectar no las devuelve.
          setSurvivalStandings(s.survivalStandings ?? []);
          setMyLives(s.myLives ?? null);
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
        setQuestion(d.question);
        setFreeText(d.freeText);
        setMyAttempts([]);
        setGuessEvaluation(null);
        setMyAnswer(null);
        setAnswerProgress(null);
        setDistribution(null);
        setAnswersOpen(false);
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
    // La ventana de respuesta se abre cuando arranca el fragmento y se cierra
    // al revelar; el servidor rechaza cualquier cosa fuera de ahí.
    socket.on('round:started', () => setAnswersOpen(true));
    socket.on(
      'round:revealed',
      p<RoundRevealedPayload>((d) => {
        setRevealed(d);
        setAwaitingReveal(false);
        setAnswersOpen(false);
      }),
    );
    socket.on(
      'quiz:answer-submitted',
      p<QuizAnswerSubmittedPayload>((d) => setAnswerProgress(d)),
    );
    socket.on(
      'quiz:distribution-revealed',
      p<QuizDistributionPayload>((d) => setDistribution(d)),
    );
    socket.on(
      'survival:standings-updated',
      p<SurvivalStandingsPayload>((d) => setSurvivalStandings(d.standings)),
    );
    // Las vidas propias llegan en privado: el cliente no tiene que buscarse
    // en la lista, y sobre todo no las decide él.
    socket.on(
      'survival:my-lives',
      p<{ lives: number; eliminated: boolean }>((d) => setMyLives(d)),
    );
    socket.on(
      'guess:evaluation-revealed',
      p<GuessEvaluationPayload>((d) => setGuessEvaluation(d)),
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

  const submitAnswer = useCallback((optionIndex: number): Promise<SubmitAnswerAck> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, message: 'Sin conexión' });
      socket
        .timeout(5000)
        .emit('player:answer', { optionIndex }, (err: unknown, ack: SubmitAnswerAck) => {
          const result: SubmitAnswerAck = err ? { ok: false, message: 'Tiempo agotado' } : ack;
          // Se marca la elección en la interfaz, pero el ack no dice si es
          // correcta: eso solo se sabe al revelarse la ronda.
          if (result.ok) setMyAnswer(optionIndex);
          resolve(result);
        });
    });
  }, []);

  const submitTextAnswer = useCallback((text: string): Promise<SubmitTextAnswerAck> => {
    return new Promise((resolve) => {
      const socket = socketRef.current;
      if (!socket) return resolve({ ok: false, message: 'Sin conexión' });
      socket
        .timeout(5000)
        .emit('player:text-answer', { text }, (err: unknown, ack: SubmitTextAnswerAck) => {
          const result: SubmitTextAnswerAck = err ? { ok: false, message: 'Tiempo agotado' } : ack;
          // Se apunta el intento gastado. El ack no dice si es correcta: eso
          // solo se sabe al revelarse la ronda.
          if (result.ok) setMyAttempts((prev) => [...prev, text.trim()]);
          resolve(result);
        });
    });
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
    question,
    myAnswer,
    answerProgress,
    answersOpen,
    distribution,
    freeText,
    myAttempts,
    guessEvaluation,
    submitTextAnswer,
    survivalStandings,
    myLives,
    submitAnswer,
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
