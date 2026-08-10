/**
 * Contratos WebSocket compartidos entre cliente y servidor.
 * contractVersion se incrementa ante cambios incompatibles.
 */

import type { BingoRevealMode, GameMode } from './game-modes';

export const CONTRACT_VERSION = 1;

export type BaseRealtimeEvent<T> = {
  eventId: string;
  roomId: string;
  gameId: string;
  sequenceNumber: number;
  serverTimestamp: number;
  contractVersion: number;
  payload: T;
};

// ---------- Estado ----------

export type CellView = {
  id: string;
  position: number;
  displayTitle: string;
  displayArtist: string;
  isFree: boolean;
  status: 'UNMARKED' | 'PENDING' | 'VALID' | 'INVALID';
};

export type CardView = {
  id: string;
  size: number;
  cells: CellView[];
};

export type ParticipantView = {
  id: string;
  alias: string;
  role: 'HOST' | 'PLAYER' | 'SCREEN';
  connected: boolean;
  audioStatus: 'NOT_ENABLED' | 'TESTING' | 'READY' | 'PRELOADING' | 'ERROR';
  score: number;
};

export type LeaderboardEntry = {
  participantId: string;
  alias: string;
  score: number;
  position: number;
  streak: number;
  correctMarks: number;
};

export type RoundView = {
  id: string;
  index: number;
  totalRounds: number;
  status: string;
  startsAt: number | null;
  endsAt: number | null;
  revealed: { title: string; artist: string } | null;
  /** La pregunta en curso, sin la solución, para reconectar a media ronda. */
  question: QuizQuestionView | null;
  /** Si quien pide el estado ya respondió, y qué opción eligió. */
  myAnswer: { optionIndex: number } | null;
  /** El enunciado de la ronda de respuesta libre, sin la solución. */
  freeText: FreeTextQuestionView | null;
  /** Intentos ya gastados por quien pide el estado, en orden. */
  myAttempts: string[];
};

/** Vidas propias en Supervivencia. Nulo en los demás modos. */
export type MyLivesView = { lives: number; eliminated: boolean } | null;

/** Lo que de una ronda de respuesta libre puede ver quien juega. */
export type FreeTextQuestionView = {
  type: 'SONG_TITLE' | 'ARTIST' | 'TITLE_AND_ARTIST';
  prompt: string;
};

/** Cómo se resolvió una ronda de respuesta libre. Solo tras el reveal. */
export type GuessEvaluationPayload = {
  roundId: string;
  correctText: string;
  correctCount: number;
  answeredCount: number;
  totalPlayers: number;
  /** Cuántos aciertos llegaron por cada camino. */
  byType: { EXACT: number; ALIAS: number; NORMALIZED: number; FUZZY: number };
};

/** Estado de vidas de una persona, tal y como lo ve la sala. */
export type SurvivalStandingView = {
  participantId: string;
  alias: string;
  lives: number;
  eliminated: boolean;
  eliminatedAtRound: number | null;
};

export type SurvivalStandingsPayload = { standings: SurvivalStandingView[] };
export type SurvivalLifeLostPayload = { participantId: string; alias: string; lives: number };
export type SurvivalEliminatedPayload = {
  participantId: string;
  alias: string;
  roundIndex: number;
};

export type SubmitTextAnswerRequest = { text: string };
export type SubmitTextAnswerAck = {
  ok: boolean;
  message?: string;
  /** Intentos restantes; `null` significa ilimitados. */
  attemptsLeft?: number | null;
};

export type RoomStatePayload = {
  roomId: string;
  code: string;
  /**
   * Modo de juego. No confundir con `mode`, que es cómo se juega la sala
   * (proyector o remoto); esto es a qué se juega.
   */
  gameMode: GameMode;
  mode: 'PROJECTOR' | 'REMOTE' | 'HYBRID';
  status: string;
  gameName: string;
  settings: {
    cardSize: number;
    snippetDurationMs: number;
    answerWindowMs: number;
    autoReveal: boolean;
    autoAdvance: boolean;
    lineEnabled: boolean;
    bingoEnabled: boolean;
    showLeaderboard: boolean;
    /** Variante del bingo, para que la interfaz sepa qué contar. */
    revealMode: BingoRevealMode;
  };
  participants: ParticipantView[];
  round: RoundView | null;
  leaderboard: LeaderboardEntry[];
  card: CardView | null; // solo para el jugador actual
  locked: boolean;
  /** Clasificación de vidas. Vacía fuera de Supervivencia. */
  survivalStandings: SurvivalStandingView[];
  /** Vidas de quien pide el estado, para que reconectar no las devuelva. */
  myLives: MyLivesView;
};

export type RoundSchedulePayload = {
  roundId: string;
  index: number;
  previewUrl: string;
  startsAt: number;
  endsAt: number;
  durationMs: number;
  answerWindowMs: number;
  serverTimestamp: number;
};

export type RoundPreparePayload = {
  roundId: string;
  index: number;
  totalRounds: number;
  previewUrl: string;
  /**
   * Título y artista cuando la variante los enseña desde el primer segundo
   * (bingo clásico). En bingo a ciegas es `null` y el servidor no los manda
   * hasta `round:revealed`: si viajaran antes, se regalaría la respuesta.
   */
  revealed: { title: string; artist: string } | null;
  /**
   * La pregunta de la ronda en los modos que preguntan.
   *
   * Nunca dice cuál es la correcta: `QuizQuestionView` no tiene ese campo a
   * propósito, para que no pueda colarse al añadir datos a la ronda.
   */
  question: QuizQuestionView | null;
  /** El enunciado de la ronda de respuesta libre, sin la solución. */
  freeText: FreeTextQuestionView | null;
};

/** Lo que de una pregunta puede ver quien juega antes del reveal. */
export type QuizQuestionView = {
  type: 'SONG_TITLE' | 'ARTIST' | 'RELEASE_YEAR' | 'DECADE' | 'ALBUM';
  prompt: string;
  options: string[];
};

/** Cuánta gente lleva respondido. No dice quién ni qué. */
export type QuizAnswerSubmittedPayload = {
  answeredCount: number;
  totalPlayers: number;
};

/** La solución y el reparto de respuestas. Solo se emite tras cerrar la ronda. */
export type QuizDistributionPayload = {
  roundId: string;
  correctIndex: number;
  correctText: string;
  /** Cuántas respuestas ha recibido cada opción, en orden de opción. */
  counts: number[];
  answeredCount: number;
  totalPlayers: number;
};

export type SubmitAnswerRequest = { optionIndex: number };
export type SubmitAnswerAck = { ok: boolean; message?: string };

export type RoundRevealedPayload = {
  roundId: string;
  index: number;
  title: string;
  artist: string;
};

export type CardUpdatedPayload = {
  cellId: string;
  status: 'UNMARKED' | 'PENDING' | 'VALID' | 'INVALID';
  pointsAwarded: number;
};

export type ClaimResultPayload = {
  participantId: string;
  alias: string;
  type: 'LINE' | 'BINGO';
  accepted: boolean;
  reason?: string;
  rows?: number[];
};

export type HighlightPayload = {
  type:
    | 'FASTEST_ANSWER'
    | 'LEADER_CHANGE'
    | 'BEST_STREAK'
    | 'FIRST_LINE'
    | 'BINGO'
    | 'BIGGEST_COMEBACK'
    // Modos de pregunta. Los que no son de nadie en concreto llegan con
    // `alias` vacío: son hitos de la ronda, no de una persona.
    | 'ONLY_CORRECT'
    | 'ALL_CORRECT'
    | 'NOBODY_CORRECT'
    | 'POPULAR_DISTRACTOR'
    // Supervivencia
    | 'FIRST_ELIMINATION'
    | 'LAST_SURVIVOR'
    | 'MULTIPLE_ELIMINATION'
    | 'SURVIVED_ON_ONE_LIFE';
  alias: string;
  roundIndex: number | null;
  data?: Record<string, unknown>;
};

export type GameFinishedPayload = {
  podium: LeaderboardEntry[];
  leaderboard: LeaderboardEntry[];
  highlights: HighlightPayload[];
  totalRounds: number;
  durationMs: number;
};

export type RoomErrorPayload = { code: string; message: string };

// ---------- Nombres de eventos ----------

export const ClientEvents = {
  RoomJoin: 'room:join',
  RoomReconnect: 'room:reconnect',
  RoomLeave: 'room:leave',
  PlayerUpdateAlias: 'player:update-alias',
  PlayerReady: 'player:ready',
  AudioEnabled: 'audio:enabled',
  AudioPreloadStatus: 'audio:preload-status',
  AudioStarted: 'audio:started',
  AudioError: 'audio:error',
  AudioDriftReport: 'audio:drift-report',
  CardMark: 'card:mark',
  PlayerAnswer: 'player:answer',
  PlayerTextAnswer: 'player:text-answer',
  ClaimLine: 'claim:line',
  ClaimBingo: 'claim:bingo',
  HostStart: 'host:start',
  HostPause: 'host:pause',
  HostResume: 'host:resume',
  HostSkip: 'host:skip',
  HostReplay: 'host:replay',
  HostReveal: 'host:reveal',
  HostNext: 'host:next',
  HostAddTime: 'host:add-time',
  HostEnd: 'host:end',
  PlayerReact: 'player:react',
  HostKick: 'host:kick',
  HostLock: 'host:lock',
} as const;

/**
 * Reacciones que puede lanzar quien juega. Es un juego de conjunto, así que se
 * ven en la pantalla de proyección y las ve todo el mundo.
 *
 * El repertorio es cerrado a propósito: no hay servicio externo de imágenes,
 * ni nada que moderar, y funciona sin conexión.
 */
export const REACTIONS = ['fuego', 'aplauso', 'risa', 'corazon', 'fiesta', 'baile'] as const;
export type Reaction = (typeof REACTIONS)[number];

export type ReactionPayload = {
  participantId: string;
  alias: string;
  reaction: Reaction;
};

/** Resumen de lo que ha pasado en la ronda, para enseñarlo entre canción y canción. */
export type RoundResultsPayload = {
  roundId: string;
  index: number;
  /** Quién la cazó antes, si alguien lo hizo. */
  fastest: { alias: string; latencyMs: number } | null;
  /** Cuánta gente la tenía y la marcó. */
  correctCount: number;
  totalPlayers: number;
  /** Rachas vivas al acabar la ronda, de mayor a menor. */
  streaks: Array<{ alias: string; streak: number }>;
  /** Quién ha adelantado a quién desde la ronda anterior. */
  climbers: Array<{ alias: string; from: number; to: number }>;
};

export const ServerEvents = {
  RoomState: 'room:state',
  ParticipantJoined: 'room:participant-joined',
  ParticipantLeft: 'room:participant-left',
  ParticipantUpdated: 'room:participant-updated',
  GameCountdown: 'game:countdown',
  GameStarted: 'game:started',
  GamePaused: 'game:paused',
  GameResumed: 'game:resumed',
  RoundPrepare: 'round:prepare',
  RoundSchedule: 'round:schedule',
  RoundStarted: 'round:started',
  RoundRevealed: 'round:revealed',
  RoundSkipped: 'round:skipped',
  RoundReplayed: 'round:replayed',
  CardUpdated: 'card:updated',
  QuizAnswerSubmitted: 'quiz:answer-submitted',
  QuizDistributionRevealed: 'quiz:distribution-revealed',
  GuessEvaluationRevealed: 'guess:evaluation-revealed',
  SurvivalLifeLost: 'survival:life-lost',
  SurvivalPlayerEliminated: 'survival:player-eliminated',
  SurvivalStandingsUpdated: 'survival:standings-updated',
  SurvivalMyLives: 'survival:my-lives',
  ClaimAccepted: 'claim:accepted',
  ClaimRejected: 'claim:rejected',
  LeaderboardUpdated: 'leaderboard:updated',
  HighlightCreated: 'highlight:created',
  RoundResults: 'round:results',
  ReactionSent: 'reaction:sent',
  GameFinished: 'game:finished',
  RoomError: 'room:error',
} as const;

export type MarkCellRequest = { cellId: string; idempotencyKey?: string };
export type ClaimRequest = { idempotencyKey?: string };
export type MarkCellAck = {
  ok: boolean;
  status?: 'VALID' | 'INVALID';
  message?: string;
};
