/**
 * Contratos WebSocket compartidos entre cliente y servidor.
 * contractVersion se incrementa ante cambios incompatibles.
 */

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
};

export type RoomStatePayload = {
  roomId: string;
  code: string;
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
  };
  participants: ParticipantView[];
  round: RoundView | null;
  leaderboard: LeaderboardEntry[];
  card: CardView | null; // solo para el jugador actual
  locked: boolean;
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
};

export type RoundRevealedPayload = {
  roundId: string;
  index: number;
  title: string;
  artist: string;
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
    | 'BIGGEST_COMEBACK';
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
  HostKick: 'host:kick',
  HostLock: 'host:lock',
} as const;

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
  ClaimAccepted: 'claim:accepted',
  ClaimRejected: 'claim:rejected',
  LeaderboardUpdated: 'leaderboard:updated',
  HighlightCreated: 'highlight:created',
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
