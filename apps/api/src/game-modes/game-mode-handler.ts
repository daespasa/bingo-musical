import type { ConfigForMode, GameMode } from '@bingo/shared';

/**
 * Contrato de un modo de juego.
 *
 * Todo lo que comparten las partidas —sala, código, QR, lobby, participantes,
 * audio y su sincronización, temporizador, ranking, highlights, ceremonia,
 * reacciones, reconexión— vive en el motor común. Un handler solo aporta lo
 * que hace distinto a su modo: cómo se arma una ronda, cómo se juzga una
 * respuesta, cuántos puntos vale y cuándo se acaba la partida.
 *
 * El objetivo práctico es que añadir un modo no obligue a tocar `switch`
 * repartidos por la aplicación: se implementa esta interfaz y se registra.
 */
export interface GameModeHandler<
  M extends GameMode = GameMode,
  TRoundPayload = unknown,
  TAnswer = unknown,
  TResult = unknown,
> {
  readonly mode: M;

  /**
   * Valida la configuración específica del modo.
   *
   * Se llama al crear la partida (dato de la red) y al cargarla (dato de la
   * columna JSON). Lanza si no encaja: es preferible fallar a jugar con reglas
   * que nadie ha comprobado.
   */
  validateConfig(config: unknown): ConfigForMode<M>;

  /** Arma la ronda `index`: qué suena y qué se pregunta. */
  createRound(context: CreateRoundContext<M>): Promise<TRoundPayload>;

  /**
   * Juzga una respuesta. La autoridad es siempre el servidor: el cliente
   * manda lo que ha hecho la persona, nunca el veredicto.
   */
  evaluateAnswer(context: EvaluateAnswerContext<M, TRoundPayload, TAnswer>): Promise<TResult>;

  /** Traduce el resultado a eventos de puntuación. Nunca los persiste. */
  calculateScore(context: ScoreContext<M, TResult>): ScoreEventInput[];

  /** Si la partida ha terminado por las reglas del modo, no por las rondas. */
  isGameFinished(context: GameProgressContext<M>): boolean;
}

/** Datos del catálogo que el motor pone a disposición de los handlers. */
export type RoundTrack = {
  id: string;
  title: string;
  artist: string;
  previewUrl: string;
  releaseYear: number | null;
  album: string | null;
};

export type CreateRoundContext<M extends GameMode> = {
  roomId: string;
  config: ConfigForMode<M>;
  /** Índice de la ronda, empezando en 0. */
  index: number;
  totalRounds: number;
  /** La pista que suena en esta ronda, ya elegida por el motor común. */
  track: RoundTrack;
  /** El resto del catálogo, para construir distractores sin salir de él. */
  pool: readonly RoundTrack[];
};

export type EvaluateAnswerContext<M extends GameMode, TRoundPayload, TAnswer> = {
  roomId: string;
  config: ConfigForMode<M>;
  participantId: string;
  round: TRoundPayload;
  answer: TAnswer;
  /** Milisegundos desde que empezó a sonar el fragmento. */
  latencyMs: number;
};

export type ScoreContext<M extends GameMode, TResult> = {
  config: ConfigForMode<M>;
  participantId: string;
  result: TResult;
  latencyMs: number;
  /** Aciertos encadenados antes de esta respuesta. */
  streak: number;
  /** Ventana total de respuesta, para el bonus por velocidad. */
  windowMs: number;
  scoring: ScoringSettings;
};

/** Los valores de puntuación configurables de la partida (`GameSettings`). */
export type ScoringSettings = {
  correctMarkPoints: number;
  speedBonusMax: number;
  streakBonusPoints: number;
  linePoints: number;
  bingoPoints: number;
  wrongMarkPenalty: number;
  wrongClaimPenalty: number;
};

/**
 * Un cambio de puntuación pendiente de persistir.
 *
 * Todo lo que mueve el marcador pasa por aquí y acaba en `ScoreEvent`, para
 * que el ranking sea reconstruible desde la base de datos. Las vidas de
 * Supervivencia **no** son puntos y no viajan en esta estructura.
 */
export type ScoreEventInput = {
  type: string;
  points: number;
};

export type GameProgressContext<M extends GameMode> = {
  config: ConfigForMode<M>;
  roundIndex: number;
  totalRounds: number;
  /** Participantes que siguen pudiendo responder. */
  activeParticipantIds: readonly string[];
};
