import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  completedRows,
  createRng,
  normalizeAnswer,
  effectiveValidPositions,
  isFullCard,
  seededShuffle,
  type GameFinishedPayload,
  type HighlightPayload,
  readGameModeConfig,
  type GameMode,
  type LeaderboardEntry,
  type FreeTextConfig,
  type SurvivalConfig,
  type MixedConfig,
  type MixedRoundDefinition,
  type MultipleChoiceQuestionType,
  type FreeTextQuestionType,
  type MultipleChoiceConfig,
  type MusicBingoConfig,
  type RoundView,
} from '@bingo/shared';
import type { GameSettings, HighlightType } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { GameModeRegistry } from '../game-modes/game-mode.registry';
import { revealedInfo } from '../game-modes/music-bingo.handler';
import { toPublicQuizRound, type QuizRoundPayload } from '../game-modes/multiple-choice.handler';
import {
  toPublicFreeTextRound,
  type FreeTextResult,
  type FreeTextRoundPayload,
} from '../game-modes/free-text.handler';
import type { RoundTrack } from '../game-modes/game-mode-handler';
import { buildMixedPlan, roundDefinitionAt } from '../game-modes/mixed-plan';
import {
  applyRoundOutcome,
  initialLifeState,
  isActive,
  isSurvivalFinished,
  sortStandings,
  type LifeState,
  type SurvivalStanding,
} from '../game-modes/survival-rules';
import { CardsService } from './cards.service';

export type EnginePhase =
  | 'LOBBY'
  | 'PREPARING_AUDIO'
  | 'SCHEDULED'
  | 'PLAYING'
  | 'ANSWER_WINDOW'
  | 'REVEALING'
  | 'ROUND_RESULTS'
  | 'PAUSED'
  | 'FINISHED';

export type EngineEmitter = {
  toRoom: (event: string, payload: unknown) => void;
  toParticipant: (participantId: string, event: string, payload: unknown) => void;
};

type RoundRuntime = {
  roundId: string;
  index: number;
  trackId: string;
  previewUrl: string;
  title: string;
  artist: string;
  startsAt: number | null;
  endsAt: number | null;
  answerEndsAt: number | null;
  preloadReady: Set<string>;
  fastest: { participantId: string; alias: string; latencyMs: number } | null;
  /**
   * La pregunta de esta ronda, en los modos que preguntan.
   *
   * Incluye la respuesta correcta, así que vive solo en el servidor: lo que
   * viaja al cliente pasa antes por `toPublicQuizRound`.
   */
  question: (QuizRoundPayload & { questionId: string; optionIds: string[] }) | null;
  /**
   * La ronda de respuesta libre. Igual que `question`, incluye la solución y
   * solo sale hacia la red a través de `toPublicFreeTextRound`.
   */
  freeText: (FreeTextRoundPayload & { questionId: string }) | null;
  /** Qué ha respondido cada participante en esta ronda. */
  answers: Map<string, { optionIndex: number; correct: boolean; latencyMs: number }>;
  /**
   * Respuestas escritas por participante, en orden de intento.
   *
   * Se guardan todas: interesa saber cuántos intentos hizo falta y con qué se
   * acertó, no solo el veredicto final.
   */
  textAnswers: Map<string, Array<{ text: string; evaluation: FreeTextResult; latencyMs: number }>>;
};

type RoomRuntime = {
  roomId: string;
  gameId: string;
  settings: GameSettings;
  /**
   * Configuración del modo, validada al cargar la partida. Se guarda en el
   * runtime para no releerla en cada marca y para que el modo no pueda cambiar
   * a mitad de sala.
   */
  bingoConfig: MusicBingoConfig;
  /** Modo de la partida, leído de la fila persistida y fijo mientras dura. */
  mode: GameMode;
  quizConfig: MultipleChoiceConfig | null;
  freeTextConfig: FreeTextConfig | null;
  survivalConfig: SurvivalConfig | null;
  /**
   * Reparto de rondas del modo mixto, calculado una vez al empezar.
   *
   * Se guarda porque tiene que ser el mismo durante toda la partida: si se
   * recalculara por ronda con otro total, cambiaría la mezcla a mitad.
   */
  mixedPlan: MixedRoundDefinition[] | null;
  /**
   * Vidas por participante. Se refleja en `PlayerLifeState`, que es la
   * autoridad: el cliente nunca decide vidas ni eliminación.
   */
  lives: Map<string, LifeState>;
  /** Aciertos y tiempo acumulado, para el desempate determinista. */
  survivalStats: Map<string, { correctAnswers: number; totalLatencyMs: number }>;
  tracks: Map<string, RoundTrack>;
  order: string[]; // trackIds en orden de ronda
  phase: EnginePhase;
  phaseBeforePause: EnginePhase | null;
  currentRound: RoundRuntime | null;
  /** Posición de cada jugador al acabar la ronda anterior, para ver quién sube. */
  positionsBefore: Map<string, number>;
  scores: Map<string, number>;
  streaks: Map<string, number>;
  correctMarks: Map<string, number>;
  claimedRows: Map<string, Set<number>>;
  lineClaimed: boolean;
  aliases: Map<string, string>;
  timers: NodeJS.Timeout[];
  leaderBefore: string | null;
  startedAt: number;
  highlights: HighlightPayload[];
  seq: number;
};

const PRELOAD_TIMEOUT_MS = 8000;
const SCHEDULE_LEAD_MS = 3000;

@Injectable()
export class GameEngineService {
  private readonly logger = new Logger(GameEngineService.name);
  private readonly rooms = new Map<string, RoomRuntime>();
  private emitter: EngineEmitter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CardsService,
    private readonly modes: GameModeRegistry,
  ) {}

  bindEmitter(emitter: EngineEmitter): void {
    this.emitter = emitter;
  }

  getRuntime(roomId: string): RoomRuntime | undefined {
    return this.rooms.get(roomId);
  }

  roundView(roomId: string, forParticipantId?: string): RoundView | null {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound) return null;
    const r = rt.currentRound;
    const myAnswer = forParticipantId ? (r.answers.get(forParticipantId) ?? null) : null;
    // Tras el reveal la canción se ve siempre; antes, solo si la variante la
    // enseña desde el principio (bingo clásico).
    const revealed = ['REVEALING', 'ROUND_RESULTS'].includes(rt.phase)
      ? { title: r.title, artist: r.artist }
      : revealedInfo(rt.bingoConfig, r);
    return {
      id: r.roundId,
      index: r.index,
      totalRounds: rt.order.length,
      status: rt.phase,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      revealed,
      // Sin la solución: reconectar no puede ser una forma de averiguarla.
      question: r.question ? toPublicQuizRound(r.question) : null,
      myAnswer: myAnswer ? { optionIndex: myAnswer.optionIndex } : null,
      freeText: r.freeText ? toPublicFreeTextRound(r.freeText) : null,
      // Los intentos ya gastados, sin decir si acertaron: reconectar no puede
      // servir para averiguar la solución ni para recuperar intentos.
      myAttempts: forParticipantId
        ? (r.textAnswers.get(forParticipantId) ?? []).map((attempt) => attempt.text)
        : [],
    };
  }

  async leaderboard(roomId: string): Promise<LeaderboardEntry[]> {
    const rt = this.rooms.get(roomId);
    if (!rt) return this.leaderboardFromDb(roomId);
    const entries = [...rt.scores.entries()].map(([participantId, score]) => ({
      participantId,
      alias: rt.aliases.get(participantId) ?? '???',
      score,
      streak: rt.streaks.get(participantId) ?? 0,
      correctMarks: rt.correctMarks.get(participantId) ?? 0,
      position: 0,
    }));
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => (e.position = i + 1));
    return entries;
  }

  private async leaderboardFromDb(roomId: string): Promise<LeaderboardEntry[]> {
    const events = await this.prisma.scoreEvent.groupBy({
      by: ['participantId'],
      where: { roomId },
      _sum: { points: true },
    });
    const participants = await this.prisma.roomParticipant.findMany({
      where: { roomId, role: 'PLAYER' },
    });
    const byId = new Map(participants.map((p) => [p.id, p.alias]));
    const entries = events.map((e) => ({
      participantId: e.participantId,
      alias: byId.get(e.participantId) ?? '???',
      score: e._sum.points ?? 0,
      streak: 0,
      correctMarks: 0,
      position: 0,
    }));
    entries.sort((a, b) => b.score - a.score);
    entries.forEach((entry, i) => (entry.position = i + 1));
    return entries;
  }

  private emitRoom(rt: RoomRuntime, event: string, payload: unknown): void {
    this.emitter?.toRoom(event, {
      eventId: randomUUID(),
      roomId: rt.roomId,
      gameId: rt.gameId,
      sequenceNumber: ++rt.seq,
      serverTimestamp: Date.now(),
      contractVersion: 1,
      payload,
    });
  }

  private emitParticipant(
    rt: RoomRuntime,
    participantId: string,
    event: string,
    payload: unknown,
  ): void {
    this.emitter?.toParticipant(participantId, event, {
      eventId: randomUUID(),
      roomId: rt.roomId,
      gameId: rt.gameId,
      sequenceNumber: ++rt.seq,
      serverTimestamp: Date.now(),
      contractVersion: 1,
      payload,
    });
  }

  private clearTimers(rt: RoomRuntime): void {
    for (const t of rt.timers) clearTimeout(t);
    rt.timers = [];
  }

  private after(rt: RoomRuntime, ms: number, fn: () => void): void {
    rt.timers.push(setTimeout(fn, ms));
  }

  // ---------- Ciclo de vida ----------

  async start(roomId: string): Promise<void> {
    if (this.rooms.get(roomId)?.phase && this.rooms.get(roomId)!.phase !== 'LOBBY') return;

    const room = await this.prisma.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        game: {
          include: {
            settings: true,
            collection: {
              include: {
                tracks: {
                  orderBy: { position: 'asc' },
                  include: {
                    track: { include: { artist: true, album: true, previews: true } },
                  },
                },
              },
            },
          },
        },
        participants: { where: { kickedAt: null } },
      },
    });
    const settings = room.game.settings!;
    // El modo sale de la partida persistida, nunca de quien abre la sala. Si
    // la configuración guardada no es válida, es mejor no empezar.
    const mode = room.game.mode;
    const storedConfig = readGameModeConfig(mode, room.game.modeConfig);
    // Se valida contra el registro, que además se niega si el modo no tiene
    // handler: preferimos no abrir la sala a abrirla sin saber conducirla.
    this.modes.validateConfig(mode, storedConfig);

    const bingoConfig =
      mode === 'MUSIC_BINGO'
        ? (storedConfig as MusicBingoConfig)
        : readGameModeConfig('MUSIC_BINGO', null);
    const quizConfig = mode === 'MULTIPLE_CHOICE' ? (storedConfig as MultipleChoiceConfig) : null;
    const freeTextConfig = mode === 'FREE_TEXT' ? (storedConfig as FreeTextConfig) : null;
    const survivalConfig = mode === 'SURVIVAL' ? (storedConfig as SurvivalConfig) : null;
    const mixedConfig = mode === 'MIXED' ? (storedConfig as MixedConfig) : null;

    // Supervivencia no monta una ronda propia: usa la del quiz o la de la
    // respuesta libre. Derivando aquí su configuración, toda la maquinaria de
    // preguntas, respuestas y persistencia funciona sin duplicar nada.
    const quizGenerico: MultipleChoiceConfig = {
      mode: 'MULTIPLE_CHOICE',
      configVersion: 1,
      questionTypes: ['SONG_TITLE'],
      optionCount: 4,
      showOptionsFromStart: true,
      allowChangeAnswer: false,
      wrongAnswerPenalty: 0,
      distractorDifficulty: 'MEDIA',
    };
    const freeTextGenerico: FreeTextConfig = {
      mode: 'FREE_TEXT',
      configVersion: 1,
      questionTypes: ['SONG_TITLE'],
      attempts: 1,
      fuzzyEnabled: true,
    };

    const quizForSurvival: MultipleChoiceConfig | null =
      survivalConfig?.roundKind === 'MULTIPLE_CHOICE'
        ? {
            mode: 'MULTIPLE_CHOICE',
            configVersion: survivalConfig.configVersion,
            questionTypes: ['SONG_TITLE'],
            optionCount: 4,
            showOptionsFromStart: true,
            allowChangeAnswer: false,
            wrongAnswerPenalty: 0,
            distractorDifficulty: 'MEDIA',
          }
        : null;
    const freeTextForSurvival: FreeTextConfig | null =
      survivalConfig?.roundKind === 'FREE_TEXT'
        ? {
            mode: 'FREE_TEXT',
            configVersion: survivalConfig.configVersion,
            questionTypes: ['SONG_TITLE'],
            attempts: 1,
            fuzzyEnabled: true,
          }
        : null;

    const tracks = new Map<string, RoundTrack>();
    for (const ct of room.game.collection.tracks) {
      const preview = ct.track.previews.find((p) => p.status === 'AVAILABLE' && p.url);
      if (!preview?.url) continue;
      tracks.set(ct.track.id, {
        id: ct.track.id,
        title: ct.track.title,
        artist: ct.track.artist.name,
        previewUrl: preview.url,
        releaseYear: ct.track.releaseYear,
        album: ct.track.album?.title ?? null,
      });
    }
    const pool = [...tracks.values()];
    let order = pool.map((t) => t.id);
    if (settings.shuffleTracks) {
      order = seededShuffle(order, createRng(`order:${roomId}`));
    }

    const rt: RoomRuntime = {
      roomId,
      gameId: room.gameId,
      settings,
      bingoConfig,
      mode,
      // En mixto se dejan los dos: cuál se usa lo decide el plan en cada ronda.
      quizConfig: quizConfig ?? quizForSurvival ?? (mixedConfig ? quizGenerico : null),
      freeTextConfig:
        freeTextConfig ?? freeTextForSurvival ?? (mixedConfig ? freeTextGenerico : null),
      survivalConfig,
      // El plan necesita saber cuántas rondas hay, y eso solo se sabe con el
      // orden ya construido.
      mixedPlan: mixedConfig ? buildMixedPlan(mixedConfig, order.length) : null,
      lives: new Map(),
      survivalStats: new Map(),
      tracks,
      order,
      phase: 'LOBBY',
      phaseBeforePause: null,
      currentRound: null,
      positionsBefore: new Map(),
      scores: new Map(),
      streaks: new Map(),
      correctMarks: new Map(),
      claimedRows: new Map(),
      lineClaimed: false,
      aliases: new Map(),
      timers: [],
      leaderBefore: null,
      startedAt: Date.now(),
      highlights: [],
      seq: 0,
    };
    for (const p of room.participants) {
      rt.aliases.set(p.id, p.alias);
      if (p.role === 'PLAYER') {
        rt.scores.set(p.id, 0);
        rt.streaks.set(p.id, 0);
        rt.correctMarks.set(p.id, 0);
        if (survivalConfig) {
          rt.lives.set(p.id, initialLifeState(survivalConfig));
          rt.survivalStats.set(p.id, { correctAnswers: 0, totalLatencyMs: 0 });
        }
      }
    }
    this.rooms.set(roomId, rt);

    // Las vidas se persisten desde el principio: son la autoridad sobre quién
    // sigue jugando y tienen que sobrevivir a una reconexión.
    if (survivalConfig) {
      for (const [participantId, state] of rt.lives) {
        await this.prisma.playerLifeState.upsert({
          where: { participantId },
          update: { lives: state.lives, eliminatedAtRound: null, eliminationOrder: null },
          create: { roomId, participantId, lives: state.lives },
        });
      }
    }

    // Los cartones son del bingo. Los modos de pregunta no reparten nada:
    // generarlos igualmente dejaría filas huérfanas y confundiría al historial.
    if (mode === 'MUSIC_BINGO') {
      const size = settings.cardSize as 3 | 4 | 5;
      await this.cards.generateForRoom(roomId, pool, size, settings.freeCenter);
    }
    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'PLAYING', startedAt: new Date(), lockedAt: new Date() },
    });

    this.emitRoom(rt, 'game:started', { totalRounds: order.length });
    await this.startRound(rt, 0);
  }

  private async startRound(rt: RoomRuntime, index: number): Promise<void> {
    if (index >= rt.order.length) {
      await this.finish(rt.roomId);
      return;
    }
    this.clearTimers(rt);
    const trackId = rt.order[index]!;
    const track = rt.tracks.get(trackId)!;

    const round = await this.prisma.gameRound.upsert({
      where: { roomId_index: { roomId: rt.roomId, index } },
      update: { status: 'PREPARING_AUDIO' },
      create: { roomId: rt.roomId, index, trackId, status: 'PREPARING_AUDIO' },
    });

    rt.currentRound = {
      roundId: round.id,
      index,
      trackId,
      previewUrl: track.previewUrl,
      title: track.title,
      artist: track.artist,
      startsAt: null,
      endsAt: null,
      answerEndsAt: null,
      preloadReady: new Set(),
      fastest: null,
      question: null,
      freeText: null,
      answers: new Map(),
      textAnswers: new Map(),
    };
    rt.phase = 'PREPARING_AUDIO';

    // En mixto es el reparto quien decide el reto de esta ronda; en los demás
    // modos, el propio modo.
    const mixedRound = rt.mixedPlan ? roundDefinitionAt(rt.mixedPlan, index) : null;
    const conOpciones = mixedRound
      ? mixedRound.kind === 'MULTIPLE_CHOICE'
      : rt.mode === 'MULTIPLE_CHOICE' || rt.mode === 'SURVIVAL';
    const conTexto = mixedRound
      ? mixedRound.kind === 'FREE_TEXT'
      : rt.mode === 'FREE_TEXT' || rt.mode === 'SURVIVAL';

    if (conOpciones && rt.quizConfig) {
      rt.currentRound.question = await this.buildAndStoreQuestion(
        rt,
        round.id,
        index,
        track,
        mixedRound?.questionType,
      );
    }
    if (conTexto && rt.freeTextConfig) {
      rt.currentRound.freeText = await this.buildAndStoreFreeTextRound(
        rt,
        round.id,
        index,
        track,
        mixedRound?.questionType === 'ARTIST' ? 'ARTIST' : 'SONG_TITLE',
      );
    }

    this.emitRoom(rt, 'round:prepare', {
      roundId: round.id,
      index,
      totalRounds: rt.order.length,
      previewUrl: track.previewUrl,
      // En bingo a ciegas esto es `null` y el título no sale del servidor
      // hasta el reveal: mandarlo antes sería regalar la respuesta.
      revealed: revealedInfo(rt.bingoConfig, track),
      // La pregunta viaja ya despojada de la respuesta correcta.
      question: rt.currentRound.question ? toPublicQuizRound(rt.currentRound.question) : null,
      freeText: rt.currentRound.freeText ? toPublicFreeTextRound(rt.currentRound.freeText) : null,
    });

    // Programar cuando todos estén listos o venza el timeout
    this.after(rt, PRELOAD_TIMEOUT_MS, () => void this.scheduleRound(rt));
  }

  /**
   * Construye la pregunta de la ronda y la persiste con sus opciones.
   *
   * Se guarda antes de emitir nada para que todo el mundo reciba la misma
   * pregunta y para que el resultado se pueda reconstruir después sin volver a
   * generarla. `isCorrect` queda en la base de datos, nunca en el evento.
   */
  private async buildAndStoreQuestion(
    rt: RoomRuntime,
    roundId: string,
    index: number,
    track: RoundTrack,
    /** Tipo impuesto por el reparto del modo mixto, si lo hay. */
    questionType?: MultipleChoiceQuestionType,
  ): Promise<QuizRoundPayload & { questionId: string; optionIds: string[] }> {
    const handler = this.modes.resolve('MULTIPLE_CHOICE');
    const payload = await handler.createRound({
      roomId: rt.roomId,
      config: questionType ? { ...rt.quizConfig!, questionTypes: [questionType] } : rt.quizConfig!,
      index,
      totalRounds: rt.order.length,
      track,
      pool: [...rt.tracks.values()],
    });

    // Se reescribe por si la ronda se repite: dejar opciones viejas colgando
    // rompería la unicidad de posición.
    await this.prisma.roundQuestion.deleteMany({ where: { roundId } });
    const question = await this.prisma.roundQuestion.create({
      data: {
        roundId,
        type: payload.type,
        prompt: payload.prompt,
        correctText: payload.correctText,
        options: {
          create: payload.options.map((text, position) => ({
            position,
            text,
            isCorrect: position === payload.correctIndex,
          })),
        },
      },
      include: { options: { orderBy: { position: 'asc' } } },
    });

    return {
      ...payload,
      questionId: question.id,
      optionIds: question.options.map((option) => option.id),
    };
  }

  /**
   * Construye y persiste la ronda de respuesta libre.
   *
   * Se guarda como `RoundQuestion` igual que el quiz, pero sin opciones: la
   * tabla ya distingue el tipo, y así el historial no necesita dos formas de
   * contar lo mismo.
   */
  private async buildAndStoreFreeTextRound(
    rt: RoomRuntime,
    roundId: string,
    index: number,
    track: RoundTrack,
    /** Tipo impuesto por el reparto del modo mixto, si lo hay. */
    questionType?: FreeTextQuestionType,
  ): Promise<FreeTextRoundPayload & { questionId: string }> {
    const handler = this.modes.resolve('FREE_TEXT');
    const payload = await handler.createRound({
      roomId: rt.roomId,
      config: questionType
        ? { ...rt.freeTextConfig!, questionTypes: [questionType] }
        : rt.freeTextConfig!,
      index,
      totalRounds: rt.order.length,
      track,
      pool: [...rt.tracks.values()],
    });

    await this.prisma.roundQuestion.deleteMany({ where: { roundId } });
    const question = await this.prisma.roundQuestion.create({
      data: {
        roundId,
        type: payload.type === 'ARTIST' ? 'ARTIST' : 'SONG_TITLE',
        prompt: payload.prompt,
        correctText: payload.expected.text,
      },
    });

    return { ...payload, questionId: question.id };
  }

  reportPreload(roomId: string, participantId: string, ready: boolean): void {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound || rt.phase !== 'PREPARING_AUDIO') return;
    if (ready) rt.currentRound.preloadReady.add(participantId);
    const playerCount = rt.scores.size;
    if (rt.currentRound.preloadReady.size >= playerCount) {
      this.clearTimers(rt);
      void this.scheduleRound(rt);
    }
  }

  private async scheduleRound(rt: RoomRuntime): Promise<void> {
    const r = rt.currentRound;
    if (!r || !['PREPARING_AUDIO', 'PAUSED'].includes(rt.phase)) return;
    rt.phase = 'SCHEDULED';
    const startsAt = Date.now() + SCHEDULE_LEAD_MS;
    const endsAt = startsAt + rt.settings.snippetDurationMs;
    r.startsAt = startsAt;
    r.endsAt = endsAt;
    r.answerEndsAt = endsAt + rt.settings.answerWindowMs;

    await this.prisma.gameRound.update({
      where: { id: r.roundId },
      data: { status: 'SCHEDULED', startsAt: new Date(startsAt), endsAt: new Date(endsAt) },
    });

    this.emitRoom(rt, 'round:schedule', {
      roundId: r.roundId,
      index: r.index,
      previewUrl: r.previewUrl,
      startsAt,
      endsAt,
      durationMs: rt.settings.snippetDurationMs,
      answerWindowMs: rt.settings.answerWindowMs,
      serverTimestamp: Date.now(),
    });

    this.after(rt, SCHEDULE_LEAD_MS, () => {
      rt.phase = 'PLAYING';
      void this.prisma.gameRound.update({ where: { id: r.roundId }, data: { status: 'PLAYING' } });
      this.emitRoom(rt, 'round:started', { roundId: r.roundId, index: r.index });
    });
    this.after(rt, SCHEDULE_LEAD_MS + rt.settings.snippetDurationMs, () => {
      rt.phase = 'ANSWER_WINDOW';
      void this.prisma.gameRound.update({
        where: { id: r.roundId },
        data: { status: 'ANSWER_WINDOW' },
      });
    });
    this.after(
      rt,
      SCHEDULE_LEAD_MS + rt.settings.snippetDurationMs + rt.settings.answerWindowMs,
      () => {
        if (rt.settings.autoReveal) {
          void this.reveal(rt.roomId);
        } else {
          // El anfitrión decide cuándo revelar: la ventana sigue abierta.
          this.emitRoom(rt, 'round:awaiting-reveal', { roundId: r.roundId, index: r.index });
        }
      },
    );
  }

  async reveal(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    const r = rt?.currentRound;
    if (!rt || !r || ['REVEALING', 'ROUND_RESULTS', 'FINISHED'].includes(rt.phase)) return;
    this.clearTimers(rt);
    rt.phase = 'REVEALING';
    await this.prisma.gameRound.update({
      where: { id: r.roundId },
      data: { status: 'REVEALING', revealedAt: new Date() },
    });
    // La puntuación de los modos que preguntan se aplica al cerrar, no al
    // responder.
    await this.scoreQuizRound(rt, r);
    await this.scoreFreeTextRound(rt, r);
    await this.applySurvivalRound(rt, r);

    this.emitRoom(rt, 'round:revealed', {
      roundId: r.roundId,
      index: r.index,
      title: r.title,
      artist: r.artist,
    });

    if (r.question) {
      // Ahora sí puede viajar la solución: la ronda está cerrada.
      const counts = r.question.options.map(
        (_, index) => [...r.answers.values()].filter((a) => a.optionIndex === index).length,
      );
      this.emitRoom(rt, 'quiz:distribution-revealed', {
        roundId: r.roundId,
        correctIndex: r.question.correctIndex,
        correctText: r.question.correctText,
        counts,
        answeredCount: r.answers.size,
        totalPlayers: rt.scores.size,
      });
      await this.addQuizHighlights(rt, r, counts);
    }

    if (r.freeText) {
      // Ahora sí puede viajar la solución, junto con cómo se acertó: saber que
      // una respuesta coló por errata es parte de la gracia del modo.
      const attempts = [...r.textAnswers.values()];
      const aciertos = attempts
        .map((list) => list.find((a) => a.evaluation.correct))
        .filter((a): a is NonNullable<typeof a> => a !== undefined);

      const byType = { EXACT: 0, ALIAS: 0, NORMALIZED: 0, FUZZY: 0 };
      for (const acierto of aciertos) {
        const key = acierto.evaluation.matchType;
        if (key in byType) byType[key as keyof typeof byType] += 1;
      }

      this.emitRoom(rt, 'guess:evaluation-revealed', {
        roundId: r.roundId,
        correctText: r.freeText.expected.text,
        correctCount: aciertos.length,
        answeredCount: r.textAnswers.size,
        totalPlayers: rt.scores.size,
        byType,
      });

      if (aciertos.length === 0 && r.textAnswers.size > 0) {
        rt.highlights.push({ type: 'NOBODY_CORRECT', alias: '—', roundIndex: r.index, data: {} });
        this.emitRoom(rt, 'highlight:created', {
          type: 'NOBODY_CORRECT',
          alias: '—',
          roundIndex: r.index,
          data: {},
        });
      }
    }

    // Highlight: respuesta más rápida de la ronda
    if (r.fastest) {
      await this.addHighlight(rt, 'FASTEST_ANSWER', r.fastest.participantId, r.index, {
        latencyMs: r.fastest.latencyMs,
      });
    }

    // Highlight: cambio de líder
    const leaderboard = await this.leaderboard(roomId);
    const leader = leaderboard[0]?.participantId ?? null;
    if (leader && rt.leaderBefore && leader !== rt.leaderBefore) {
      await this.addHighlight(rt, 'LEADER_CHANGE', leader, r.index, {});
    }
    rt.leaderBefore = leader;

    rt.phase = 'ROUND_RESULTS';
    await this.prisma.gameRound.update({
      where: { id: r.roundId },
      data: { status: 'ROUND_RESULTS' },
    });
    await this.prisma.leaderboardSnapshot.upsert({
      where: { roomId_roundIndex: { roomId, roundIndex: r.index } },
      update: { entries: leaderboard },
      create: { roomId, roundIndex: r.index, entries: leaderboard },
    });
    this.emitRoom(rt, 'leaderboard:updated', { leaderboard });

    // Resumen de la ronda: lo que se cuenta entre canción y canción
    const positionsNow = new Map(leaderboard.map((e, i) => [e.participantId, i + 1]));
    const climbers = [...positionsNow.entries()]
      .flatMap(([participantId, to]) => {
        const from = rt.positionsBefore.get(participantId);
        if (from === undefined || from <= to) return [];
        return [{ alias: rt.aliases.get(participantId) ?? '???', from, to }];
      })
      .sort((a, b) => b.from - b.to - (a.from - a.to))
      .slice(0, 3);

    const correctCount = await this.prisma.playerMark.count({
      where: { roundId: r.roundId, isCorrect: true },
    });

    this.emitRoom(rt, 'round:results', {
      roundId: r.roundId,
      index: r.index,
      fastest: r.fastest ? { alias: r.fastest.alias, latencyMs: r.fastest.latencyMs } : null,
      correctCount,
      totalPlayers: rt.aliases.size,
      streaks: [...rt.streaks.entries()]
        .filter(([, streak]) => streak >= 2)
        .map(([participantId, streak]) => ({
          alias: rt.aliases.get(participantId) ?? '???',
          streak,
        }))
        .sort((a, b) => b.streak - a.streak)
        .slice(0, 3),
      climbers,
    });
    rt.positionsBefore = positionsNow;

    if (rt.settings.autoAdvance) {
      this.after(rt, rt.settings.roundResultsMs, () => void this.next(roomId));
    }
  }

  async next(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound) return;
    if (!['ROUND_RESULTS', 'REVEALING'].includes(rt.phase)) return;
    await this.prisma.gameRound.update({
      where: { id: rt.currentRound.roundId },
      data: { status: 'FINISHED' },
    });
    await this.startRound(rt, rt.currentRound.index + 1);
  }

  async skip(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound || rt.phase === 'FINISHED') return;
    this.clearTimers(rt);
    await this.prisma.gameRound.update({
      where: { id: rt.currentRound.roundId },
      data: { status: 'SKIPPED' },
    });
    this.emitRoom(rt, 'round:skipped', { roundId: rt.currentRound.roundId });
    await this.startRound(rt, rt.currentRound.index + 1);
  }

  async replay(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound) return;
    if (!['PLAYING', 'ANSWER_WINDOW', 'ROUND_RESULTS', 'REVEALING', 'SCHEDULED'].includes(rt.phase))
      return;
    this.clearTimers(rt);
    rt.phase = 'PREPARING_AUDIO';
    rt.currentRound.preloadReady.clear();
    this.emitRoom(rt, 'round:replayed', { roundId: rt.currentRound.roundId });
    await this.scheduleRound(rt);
  }

  pause(roomId: string): void {
    const rt = this.rooms.get(roomId);
    if (!rt || ['PAUSED', 'FINISHED', 'LOBBY'].includes(rt.phase)) return;
    this.clearTimers(rt);
    rt.phaseBeforePause = rt.phase;
    rt.phase = 'PAUSED';
    void this.prisma.room.update({ where: { id: roomId }, data: { status: 'PAUSED' } });
    this.emitRoom(rt, 'game:paused', {});
  }

  async resume(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    if (!rt || rt.phase !== 'PAUSED') return;
    await this.prisma.room.update({ where: { id: roomId }, data: { status: 'PLAYING' } });
    this.emitRoom(rt, 'game:resumed', {});
    const before = rt.phaseBeforePause;
    rt.phaseBeforePause = null;
    if (before === 'ROUND_RESULTS' || before === 'REVEALING') {
      rt.phase = before;
      return;
    }
    // Cualquier fase en vuelo se reprograma desde el principio del fragmento
    await this.scheduleRound(rt);
  }

  addTime(roomId: string, extraMs: number): void {
    const rt = this.rooms.get(roomId);
    const r = rt?.currentRound;
    if (!rt || !r || !['PLAYING', 'ANSWER_WINDOW', 'SCHEDULED'].includes(rt.phase)) return;
    const remainingToReveal = (r.answerEndsAt ?? Date.now()) - Date.now();
    r.answerEndsAt = (r.answerEndsAt ?? Date.now()) + extraMs;
    // Solo reprogramamos el timer de revelado
    const revealTimer = setTimeout(
      () => void this.reveal(roomId),
      Math.max(0, remainingToReveal + extraMs),
    );
    this.clearRevealTimers(rt);
    rt.timers.push(revealTimer);
    this.emitRoom(rt, 'round:schedule', {
      roundId: r.roundId,
      index: r.index,
      previewUrl: r.previewUrl,
      startsAt: r.startsAt,
      endsAt: r.endsAt,
      durationMs: rt.settings.snippetDurationMs,
      answerWindowMs: (r.answerEndsAt ?? 0) - (r.endsAt ?? 0),
      serverTimestamp: Date.now(),
    });
  }

  private clearRevealTimers(rt: RoomRuntime): void {
    // Simplificación: al añadir tiempo limpiamos todos los timers pendientes;
    // las transiciones PLAYING→ANSWER_WINDOW ya habrán ocurrido o se pierden
    // sin efecto funcional porque reveal() revalida el estado.
    this.clearTimers(rt);
  }

  async finish(roomId: string): Promise<void> {
    const rt = this.rooms.get(roomId);
    if (!rt || rt.phase === 'FINISHED') return;
    this.clearTimers(rt);
    rt.phase = 'FINISHED';

    const leaderboard = await this.leaderboard(roomId);
    const winner = leaderboard[0] ?? null;
    const durationMs = Date.now() - rt.startedAt;
    const totalRounds = rt.currentRound ? rt.currentRound.index + 1 : 0;

    // Highlight: mejor racha global
    let bestStreak: { participantId: string; streak: number } | null = null;
    for (const [pid, streak] of rt.streaks) {
      if (!bestStreak || streak > bestStreak.streak) bestStreak = { participantId: pid, streak };
    }
    if (bestStreak && bestStreak.streak >= 3) {
      await this.addHighlight(rt, 'BEST_STREAK', bestStreak.participantId, null, {
        streak: bestStreak.streak,
      });
    }

    await this.prisma.room.update({
      where: { id: roomId },
      data: { status: 'FINISHED', finishedAt: new Date() },
    });
    await this.prisma.gameResult.upsert({
      where: { roomId },
      update: {},
      create: {
        roomId,
        winnerParticipantId: winner?.participantId ?? null,
        totalRounds,
        durationMs,
        summary: JSON.parse(JSON.stringify({ ranking: leaderboard, highlights: rt.highlights })),
      },
    });

    const payload: GameFinishedPayload = {
      podium: leaderboard.slice(0, 3),
      leaderboard,
      highlights: rt.highlights,
      totalRounds,
      durationMs,
    };
    this.emitRoom(rt, 'game:finished', payload);
  }

  /**
   * Aplica las reglas de vidas al cerrarse la ronda.
   *
   * El cliente nunca decide esto: solo manda lo que respondió. Quién pierde
   * vida, quién queda eliminado y quién gana lo calcula el servidor a partir
   * de la evaluación que él mismo hizo.
   */
  private async applySurvivalRound(rt: RoomRuntime, r: RoundRuntime): Promise<void> {
    const config = rt.survivalConfig;
    if (!config) return;

    const eliminadosAntes = [...rt.lives.values()].filter((s) => !isActive(s)).length;
    let eliminadosAhora = 0;
    const caidos: string[] = [];

    for (const [participantId, state] of rt.lives) {
      if (!isActive(state)) continue;

      // El resultado sale de la respuesta que el servidor ya evaluó, sea del
      // quiz o de la respuesta libre.
      const quizAnswer = r.answers.get(participantId);
      const textAttempts = r.textAnswers.get(participantId);
      const answered = quizAnswer !== undefined || (textAttempts?.length ?? 0) > 0;
      const correct =
        quizAnswer?.correct === true ||
        (textAttempts?.some((attempt) => attempt.evaluation.correct) ?? false);

      const stats = rt.survivalStats.get(participantId) ?? {
        correctAnswers: 0,
        totalLatencyMs: 0,
      };
      const latencyMs =
        quizAnswer?.latencyMs ??
        textAttempts?.find((a) => a.evaluation.correct)?.latencyMs ??
        rt.settings.snippetDurationMs + rt.settings.answerWindowMs;
      if (correct) stats.correctAnswers += 1;
      stats.totalLatencyMs += latencyMs;
      rt.survivalStats.set(participantId, stats);

      const next = applyRoundOutcome({
        state,
        outcome: { answered, correct },
        config,
        roundIndex: r.index,
        // La racha ya se actualizó al puntuar, así que aquí se descuenta la
        // de esta misma ronda para no contarla dos veces.
        streakBefore: Math.max(0, (rt.streaks.get(participantId) ?? 0) - (correct ? 1 : 0)),
        eliminatedSoFar: eliminadosAntes + eliminadosAhora,
      });

      if (next.lives !== state.lives || next.eliminatedAtRound !== state.eliminatedAtRound) {
        rt.lives.set(participantId, next);
        await this.prisma.playerLifeState.update({
          where: { participantId },
          data: {
            lives: next.lives,
            eliminatedAtRound: next.eliminatedAtRound,
            eliminationOrder: next.eliminationOrder,
          },
        });

        // A quien le pasa, se le dice en privado: así el cliente conoce sus
        // vidas sin tener que buscarse en una lista.
        this.emitParticipant(rt, participantId, 'survival:my-lives', {
          lives: next.lives,
          eliminated: !isActive(next),
        });

        if (next.lives < state.lives) {
          this.emitRoom(rt, 'survival:life-lost', {
            participantId,
            alias: rt.aliases.get(participantId) ?? '???',
            lives: next.lives,
          });
        }
        if (!isActive(next)) {
          eliminadosAhora += 1;
          caidos.push(participantId);
          this.emitRoom(rt, 'survival:player-eliminated', {
            participantId,
            alias: rt.aliases.get(participantId) ?? '???',
            roundIndex: r.index,
          });
        }
      }
    }

    const standings = this.survivalStandings(rt);
    this.emitRoom(rt, 'survival:standings-updated', { standings: this.publicStandings(rt) });

    if (eliminadosAntes === 0 && caidos.length > 0) {
      await this.addHighlight(rt, 'FIRST_ELIMINATION', caidos[0]!, r.index, {});
    }
    if (caidos.length >= 2) {
      rt.highlights.push({
        type: 'MULTIPLE_ELIMINATION',
        alias: '—',
        roundIndex: r.index,
        data: { count: caidos.length },
      });
      this.emitRoom(rt, 'highlight:created', {
        type: 'MULTIPLE_ELIMINATION',
        alias: '—',
        roundIndex: r.index,
        data: { count: caidos.length },
      });
    }

    // Fin de partida por las reglas del modo, no por agotar canciones.
    if (
      isSurvivalFinished({
        standings,
        roundIndex: r.index + 1,
        totalRounds: rt.order.length,
        config,
      })
    ) {
      const superviviente = standings.find((s) => s.eliminatedAtRound === null);
      if (superviviente) {
        await this.addHighlight(rt, 'LAST_SURVIVOR', superviviente.participantId, r.index, {
          lives: superviviente.lives,
        });
        if (superviviente.lives === 1) {
          await this.addHighlight(
            rt,
            'SURVIVED_ON_ONE_LIFE',
            superviviente.participantId,
            r.index,
            {},
          );
        }
      }
      this.after(rt, 1500, () => void this.finish(rt.roomId));
    }
  }

  /** Clasificación de Supervivencia, ya ordenada con el desempate del modo. */
  private survivalStandings(rt: RoomRuntime): SurvivalStanding[] {
    const entries: SurvivalStanding[] = [...rt.lives.entries()].map(([participantId, state]) => {
      const stats = rt.survivalStats.get(participantId) ?? {
        correctAnswers: 0,
        totalLatencyMs: 0,
      };
      return {
        participantId,
        lives: state.lives,
        eliminatedAtRound: state.eliminatedAtRound,
        eliminationOrder: state.eliminationOrder,
        score: rt.scores.get(participantId) ?? 0,
        correctAnswers: stats.correctAnswers,
        totalLatencyMs: stats.totalLatencyMs,
      };
    });
    return sortStandings(entries);
  }

  /** Clasificación de vidas para el estado de sala. Vacía fuera del modo. */
  survivalStandingsView(roomId: string) {
    const rt = this.rooms.get(roomId);
    if (!rt?.survivalConfig) return [];
    return this.publicStandings(rt);
  }

  /** Vidas de una persona concreta. Nulo fuera de Supervivencia. */
  livesFor(roomId: string, participantId: string) {
    const rt = this.rooms.get(roomId);
    const state = rt?.survivalConfig ? rt.lives.get(participantId) : undefined;
    if (!state) return null;
    return { lives: state.lives, eliminated: !isActive(state) };
  }

  /** La clasificación tal y como la ve la sala, con alias en vez de ids. */
  private publicStandings(rt: RoomRuntime) {
    return this.survivalStandings(rt).map((entry) => ({
      participantId: entry.participantId,
      alias: rt.aliases.get(entry.participantId) ?? '???',
      lives: entry.lives,
      eliminated: entry.eliminatedAtRound !== null,
      eliminatedAtRound: entry.eliminatedAtRound,
    }));
  }

  /**
   * Momentos destacados propios del quiz.
   *
   * Solo se generan cuando cuentan algo: una ronda que casi nadie falla no es
   * un momento destacado, y llenar The Show de hitos vacíos lo devalúa.
   */
  private async addQuizHighlights(
    rt: RoomRuntime,
    r: RoundRuntime,
    counts: readonly number[],
  ): Promise<void> {
    const correctAnswers = [...r.answers.entries()].filter(([, a]) => a.correct);
    const players = rt.scores.size;
    if (players === 0) return;

    if (correctAnswers.length === 1) {
      await this.addHighlight(rt, 'ONLY_CORRECT', correctAnswers[0]![0], r.index, {});
    } else if (correctAnswers.length === players && players > 1) {
      await this.addHighlight(rt, 'ALL_CORRECT', correctAnswers[0]![0], r.index, {});
    }

    if (correctAnswers.length === 0 && r.answers.size > 0) {
      // Sin participante: es un hito de la ronda, no de nadie en concreto.
      rt.highlights.push({ type: 'NOBODY_CORRECT', alias: '—', roundIndex: r.index, data: {} });
      await this.prisma.highlight.create({
        data: { roomId: rt.roomId, type: 'NOBODY_CORRECT', roundIndex: r.index, data: {} },
      });
      this.emitRoom(rt, 'highlight:created', {
        type: 'NOBODY_CORRECT',
        alias: '—',
        roundIndex: r.index,
        data: {},
      });
    }

    // El distractor que más gente se ha tragado, si de verdad ha engañado.
    if (r.question) {
      let worst = -1;
      let worstCount = 0;
      counts.forEach((count, index) => {
        if (index === r.question!.correctIndex) return;
        if (count > worstCount) {
          worst = index;
          worstCount = count;
        }
      });
      if (worst >= 0 && worstCount >= 2 && worstCount > correctAnswers.length) {
        rt.highlights.push({
          type: 'POPULAR_DISTRACTOR',
          alias: '—',
          roundIndex: r.index,
          data: { text: r.question.options[worst], count: worstCount },
        });
        this.emitRoom(rt, 'highlight:created', {
          type: 'POPULAR_DISTRACTOR',
          alias: '—',
          roundIndex: r.index,
          data: { text: r.question.options[worst], count: worstCount },
        });
      }
    }
  }

  private async addHighlight(
    rt: RoomRuntime,
    type: HighlightType,
    participantId: string,
    roundIndex: number | null,
    data: Record<string, unknown>,
  ): Promise<void> {
    const alias = rt.aliases.get(participantId) ?? '???';
    const payload: HighlightPayload = { type, alias, roundIndex, data };
    rt.highlights.push(payload);
    await this.prisma.highlight.create({
      data: {
        roomId: rt.roomId,
        participantId,
        type,
        roundIndex,
        data: JSON.parse(JSON.stringify(data)),
      },
    });
    this.emitRoom(rt, 'highlight:created', payload);
  }

  // ---------- Marcas y reclamaciones ----------

  /** Reenvía una reacción a toda la sala, incluida la pantalla de proyección. */
  broadcastReaction(roomId: string, participantId: string, reaction: string): void {
    const rt = this.rooms.get(roomId);
    if (!rt) return;
    this.emitRoom(rt, 'reaction:sent', {
      participantId,
      alias: rt.aliases.get(participantId) ?? '???',
      reaction,
    });
  }

  async markCell(
    roomId: string,
    participantId: string,
    cellId: string,
  ): Promise<{ ok: boolean; status?: 'VALID' | 'INVALID'; message?: string }> {
    const rt = this.rooms.get(roomId);
    const r = rt?.currentRound;
    if (!rt || !r || !['PLAYING', 'ANSWER_WINDOW'].includes(rt.phase)) {
      return { ok: false, message: 'No hay ronda activa' };
    }
    const cell = await this.prisma.bingoCardCell.findUnique({
      where: { id: cellId },
      include: { card: true },
    });
    if (!cell || cell.card.participantId !== participantId || cell.card.roomId !== roomId) {
      return { ok: false, message: 'Casilla no válida' };
    }
    if (cell.isFree || cell.status !== 'UNMARKED') {
      return { ok: false, message: 'Casilla ya marcada' };
    }
    const existing = await this.prisma.playerMark.findUnique({
      where: { roundId_cellId: { roundId: r.roundId, cellId } },
    });
    if (existing) {
      return { ok: true, status: existing.isCorrect ? 'VALID' : 'INVALID' };
    }

    const latencyMs = r.startsAt ? Math.max(0, Date.now() - r.startsAt) : 0;
    const s = rt.settings;
    const handler = this.modes.resolve('MUSIC_BINGO');

    // El veredicto y los puntos los decide el handler del modo; el motor solo
    // los persiste y los reparte. Así, añadir un modo no obliga a tocar esto.
    const { correct: isCorrect } = await handler.evaluateAnswer({
      roomId,
      config: rt.bingoConfig,
      participantId,
      round: { trackId: r.trackId, revealed: revealedInfo(rt.bingoConfig, r) },
      answer: { cellTrackId: cell.trackId },
      latencyMs,
    });

    const streakBefore = rt.streaks.get(participantId) ?? 0;
    const events = handler.calculateScore({
      config: rt.bingoConfig,
      participantId,
      result: { correct: isCorrect },
      latencyMs,
      streak: streakBefore,
      windowMs: s.snippetDurationMs + s.answerWindowMs,
      scoring: s,
    });
    const points = events.reduce((total, event) => total + event.points, 0);

    if (isCorrect) {
      rt.streaks.set(participantId, streakBefore + 1);
      rt.correctMarks.set(participantId, (rt.correctMarks.get(participantId) ?? 0) + 1);
      if (!r.fastest || latencyMs < r.fastest.latencyMs) {
        r.fastest = {
          participantId,
          alias: rt.aliases.get(participantId) ?? '???',
          latencyMs,
        };
      }
    } else {
      rt.streaks.set(participantId, 0);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.playerMark.create({
        data: {
          roundId: r.roundId,
          participantId,
          cellId,
          isCorrect,
          latencyMs,
        },
      });
      // El fallo no se guarda en la casilla: es un suceso de esta ronda y ya
      // vive en `playerMark`, cuya clave única (roundId, cellId) impide que se
      // penalice dos veces. Si se escribiera aquí, la casilla quedaría
      // bloqueada el resto de la partida y esa canción no podría marcarse
      // cuando le tocara sonar.
      if (isCorrect) {
        await tx.bingoCardCell.update({
          where: { id: cellId },
          data: {
            status: 'VALID',
            markedAt: new Date(),
            validatedAt: new Date(),
          },
        });
      }
      for (const e of events) {
        await tx.scoreEvent.create({
          data: {
            roomId,
            participantId,
            roundId: r.roundId,
            type: e.type as never,
            points: e.points,
          },
        });
      }
    });

    rt.scores.set(participantId, (rt.scores.get(participantId) ?? 0) + points);

    // El cliente nunca decide la validez: le enviamos el veredicto del servidor
    this.emitParticipant(rt, participantId, 'card:updated', {
      cellId,
      status: isCorrect ? 'VALID' : 'INVALID',
      pointsAwarded: points,
    });

    const leaderboard = await this.leaderboard(roomId);
    this.emitRoom(rt, 'leaderboard:updated', { leaderboard });

    return { ok: true, status: isCorrect ? 'VALID' : 'INVALID' };
  }

  /**
   * Registra la respuesta de una persona a una pregunta con opciones.
   *
   * Devuelve solo si se ha aceptado el envío, **nunca** si es correcta: hasta
   * el reveal, saberlo sería saber la solución. Por la misma razón el ranking
   * no se mueve aquí: una puntuación que sube delataría el acierto.
   */
  async submitAnswer(
    roomId: string,
    participantId: string,
    optionIndex: number,
  ): Promise<{ ok: boolean; message?: string }> {
    const rt = this.rooms.get(roomId);
    const r = rt?.currentRound;
    if (!rt || !r || !r.question || !['PLAYING', 'ANSWER_WINDOW'].includes(rt.phase)) {
      return { ok: false, message: 'No hay pregunta abierta' };
    }
    if (!rt.scores.has(participantId)) {
      return { ok: false, message: 'Solo pueden responder los jugadores' };
    }
    // Quien se quedó sin vidas es espectador: lo ve todo, pero no responde.
    // Se comprueba en el servidor porque el cliente no decide esto.
    const lifeState = rt.lives.get(participantId);
    if (lifeState && !isActive(lifeState)) {
      return { ok: false, message: 'Estás eliminado: ya solo miras' };
    }
    if (optionIndex < 0 || optionIndex >= r.question.options.length) {
      return { ok: false, message: 'Opción no válida' };
    }

    const previous = r.answers.get(participantId);
    if (previous && !rt.quizConfig?.allowChangeAnswer) {
      return { ok: false, message: 'Ya has respondido' };
    }

    const handler = this.modes.resolve('MULTIPLE_CHOICE');
    const latencyMs = r.startsAt ? Math.max(0, Date.now() - r.startsAt) : 0;
    const { correct } = await handler.evaluateAnswer({
      roomId,
      config: rt.quizConfig!,
      participantId,
      round: r.question,
      answer: { optionIndex },
      latencyMs,
    });

    r.answers.set(participantId, { optionIndex, correct, latencyMs });

    // Se persiste ya, para que una reconexión sepa que esta persona respondió
    // y no la deje responder otra vez.
    await this.prisma.playerAnswer.upsert({
      where: { roundId_participantId_attempt: { roundId: r.roundId, participantId, attempt: 1 } },
      update: {
        optionId: r.question.optionIds[optionIndex] ?? null,
        isCorrect: correct,
        latencyMs,
      },
      create: {
        roundId: r.roundId,
        questionId: r.question.questionId,
        participantId,
        optionId: r.question.optionIds[optionIndex] ?? null,
        isCorrect: correct,
        latencyMs,
      },
    });

    // Al resto de la sala solo se le dice cuánta gente ha contestado ya.
    this.emitRoom(rt, 'quiz:answer-submitted', {
      answeredCount: r.answers.size,
      totalPlayers: rt.scores.size,
    });

    return { ok: true };
  }

  /**
   * Registra una respuesta escrita.
   *
   * Devuelve si se ha admitido el intento y cuántos quedan, pero **no** si es
   * correcta: igual que en el quiz, saberlo antes del reveal sería saber la
   * solución. La evaluación se guarda en el servidor y se aplica al cerrar.
   */
  async submitTextAnswer(
    roomId: string,
    participantId: string,
    text: string,
  ): Promise<{ ok: boolean; message?: string; attemptsLeft?: number | null }> {
    const rt = this.rooms.get(roomId);
    const r = rt?.currentRound;
    if (!rt || !r || !r.freeText || !['PLAYING', 'ANSWER_WINDOW'].includes(rt.phase)) {
      return { ok: false, message: 'No hay pregunta abierta' };
    }
    if (!rt.scores.has(participantId)) {
      return { ok: false, message: 'Solo pueden responder los jugadores' };
    }
    // Quien se quedó sin vidas es espectador: lo ve todo, pero no responde.
    // Se comprueba en el servidor porque el cliente no decide esto.
    const lifeState = rt.lives.get(participantId);
    if (lifeState && !isActive(lifeState)) {
      return { ok: false, message: 'Estás eliminado: ya solo miras' };
    }

    const clean = text.trim().slice(0, 120);
    if (clean.length === 0) return { ok: false, message: 'Escribe una respuesta' };

    const previous = r.textAnswers.get(participantId) ?? [];
    const maxAttempts = rt.freeTextConfig?.attempts ?? 1;

    // Con un acierto ya registrado no se sigue intentando: la ronda está
    // resuelta para esta persona.
    if (previous.some((attempt) => attempt.evaluation.correct)) {
      return { ok: false, message: 'Ya has acertado' };
    }
    if (maxAttempts !== null && previous.length >= maxAttempts) {
      return { ok: false, message: 'No te quedan intentos' };
    }

    // Anti-spam: repetir la misma respuesta no gasta intento ni se registra
    // dos veces, pero tampoco cuela.
    const normalizedNew = normalizeAnswer(clean);
    if (previous.some((attempt) => normalizeAnswer(attempt.text) === normalizedNew)) {
      return { ok: false, message: 'Ya has probado esa respuesta' };
    }

    const handler = this.modes.resolve('FREE_TEXT');
    const latencyMs = r.startsAt ? Math.max(0, Date.now() - r.startsAt) : 0;
    const evaluation = await handler.evaluateAnswer({
      roomId,
      config: rt.freeTextConfig!,
      participantId,
      round: r.freeText,
      answer: { text: clean },
      latencyMs,
    });

    const attempt = previous.length + 1;
    previous.push({ text: clean, evaluation, latencyMs });
    r.textAnswers.set(participantId, previous);

    await this.prisma.playerAnswer.upsert({
      where: { roundId_participantId_attempt: { roundId: r.roundId, participantId, attempt } },
      update: { freeText: clean, isCorrect: evaluation.correct, latencyMs },
      create: {
        roundId: r.roundId,
        questionId: r.freeText.questionId,
        participantId,
        freeText: clean,
        isCorrect: evaluation.correct,
        latencyMs,
      },
    });

    this.emitRoom(rt, 'quiz:answer-submitted', {
      answeredCount: r.textAnswers.size,
      totalPlayers: rt.scores.size,
    });

    return {
      ok: true,
      attemptsLeft: maxAttempts === null ? null : Math.max(0, maxAttempts - attempt),
    };
  }

  /**
   * Aplica la puntuación de las respuestas escritas al cerrarse la ronda.
   *
   * Igual que en el quiz: si el marcador se moviera al responder, delataría
   * quién ha acertado antes de revelar la solución.
   */
  private async scoreFreeTextRound(rt: RoomRuntime, r: RoundRuntime): Promise<void> {
    if (!r.freeText || !rt.freeTextConfig) return;
    const handler = this.modes.resolve('FREE_TEXT');
    const s = rt.settings;

    const resolved = [...r.textAnswers.entries()]
      .map(([participantId, attempts]) => {
        const winner = attempts.find((attempt) => attempt.evaluation.correct);
        return { participantId, winner, attempts };
      })
      .sort((a, b) => (a.winner?.latencyMs ?? Infinity) - (b.winner?.latencyMs ?? Infinity));

    for (const { participantId, winner } of resolved) {
      const streakBefore = rt.streaks.get(participantId) ?? 0;
      const correct = winner !== undefined;

      const events = handler.calculateScore({
        config: rt.freeTextConfig,
        participantId,
        result: winner?.evaluation ?? {
          accepted: false,
          correct: false,
          normalizedInput: '',
          matchType: 'REJECTED',
        },
        latencyMs: winner?.latencyMs ?? 0,
        streak: streakBefore,
        windowMs: s.snippetDurationMs + s.answerWindowMs,
        scoring: s,
      });

      if (correct) {
        rt.streaks.set(participantId, streakBefore + 1);
        rt.correctMarks.set(participantId, (rt.correctMarks.get(participantId) ?? 0) + 1);
        if (!r.fastest || winner.latencyMs < r.fastest.latencyMs) {
          r.fastest = {
            participantId,
            alias: rt.aliases.get(participantId) ?? '???',
            latencyMs: winner.latencyMs,
          };
        }
      } else {
        rt.streaks.set(participantId, 0);
      }

      const points = events.reduce((total, event) => total + event.points, 0);
      rt.scores.set(participantId, (rt.scores.get(participantId) ?? 0) + points);

      for (const event of events) {
        await this.prisma.scoreEvent.create({
          data: {
            roomId: rt.roomId,
            participantId,
            roundId: r.roundId,
            type: event.type as never,
            points: event.points,
          },
        });
      }
    }

    for (const participantId of rt.scores.keys()) {
      if (!r.textAnswers.has(participantId)) rt.streaks.set(participantId, 0);
    }
  }

  /**
   * Aplica la puntuación de todas las respuestas al cerrarse la ronda.
   *
   * Se hace aquí y no al responder porque el marcador es público: moverlo en
   * el momento de responder delataría quién ha acertado.
   */
  private async scoreQuizRound(rt: RoomRuntime, r: RoundRuntime): Promise<void> {
    if (!r.question || !rt.quizConfig) return;
    const handler = this.modes.resolve('MULTIPLE_CHOICE');
    const s = rt.settings;

    // Por latencia, para que las rachas y el «más rápido» sean deterministas.
    const ordered = [...r.answers.entries()].sort((a, b) => a[1].latencyMs - b[1].latencyMs);

    for (const [participantId, answer] of ordered) {
      const streakBefore = rt.streaks.get(participantId) ?? 0;
      const events = handler.calculateScore({
        config: rt.quizConfig,
        participantId,
        result: { correct: answer.correct },
        latencyMs: answer.latencyMs,
        streak: streakBefore,
        windowMs: s.snippetDurationMs + s.answerWindowMs,
        scoring: s,
      });

      if (answer.correct) {
        rt.streaks.set(participantId, streakBefore + 1);
        rt.correctMarks.set(participantId, (rt.correctMarks.get(participantId) ?? 0) + 1);
        if (!r.fastest || answer.latencyMs < r.fastest.latencyMs) {
          r.fastest = {
            participantId,
            alias: rt.aliases.get(participantId) ?? '???',
            latencyMs: answer.latencyMs,
          };
        }
      } else {
        rt.streaks.set(participantId, 0);
      }

      const points = events.reduce((total, event) => total + event.points, 0);
      rt.scores.set(participantId, (rt.scores.get(participantId) ?? 0) + points);

      for (const event of events) {
        await this.prisma.scoreEvent.create({
          data: {
            roomId: rt.roomId,
            participantId,
            roundId: r.roundId,
            type: event.type as never,
            points: event.points,
          },
        });
      }
    }

    // Quien no contestó rompe racha igual: no responder no es acertar.
    for (const participantId of rt.scores.keys()) {
      if (!r.answers.has(participantId)) rt.streaks.set(participantId, 0);
    }
  }

  async claim(
    roomId: string,
    participantId: string,
    type: 'LINE' | 'BINGO',
  ): Promise<{ accepted: boolean; reason?: string; rows?: number[] }> {
    const rt = this.rooms.get(roomId);
    if (!rt || rt.phase === 'FINISHED' || rt.phase === 'LOBBY') {
      return { accepted: false, reason: 'La partida no está activa' };
    }
    if (type === 'LINE' && !rt.settings.lineEnabled) {
      return { accepted: false, reason: 'La línea no está activada' };
    }
    if (type === 'BINGO' && !rt.settings.bingoEnabled) {
      return { accepted: false, reason: 'El bingo no está activado' };
    }

    const card = await this.prisma.bingoCard.findUnique({
      where: { participantId },
      include: { cells: true },
    });
    if (!card || card.roomId !== roomId) {
      return { accepted: false, reason: 'Cartón no encontrado' };
    }
    const validPositions = effectiveValidPositions(
      card.cells.filter((c) => c.status === 'VALID' && !c.isFree).map((c) => c.position),
      card.cells.filter((c) => c.isFree).map((c) => c.position),
    );

    const alias = rt.aliases.get(participantId) ?? '???';
    let accepted = false;
    let reason: string | undefined;
    let rows: number[] | undefined;

    if (type === 'LINE') {
      const complete = completedRows(card.size, validPositions);
      const already = rt.claimedRows.get(participantId) ?? new Set<number>();
      const fresh = complete.filter((row) => !already.has(row));
      if (fresh.length > 0) {
        accepted = true;
        rows = fresh;
        for (const row of fresh) already.add(row);
        rt.claimedRows.set(participantId, already);
      } else {
        reason = complete.length > 0 ? 'Esa línea ya fue reclamada' : 'No tienes línea completa';
      }
    } else {
      accepted = isFullCard(card.size, validPositions);
      if (!accepted) reason = 'El cartón no está completo';
    }

    const s = rt.settings;
    const points = accepted
      ? type === 'LINE'
        ? s.linePoints
        : s.bingoPoints
      : s.wrongClaimPenalty;

    await this.prisma.$transaction(async (tx) => {
      await tx.claim.create({
        data: {
          roomId,
          participantId,
          roundId: rt.currentRound?.roundId ?? null,
          type,
          status: accepted ? 'ACCEPTED' : 'REJECTED',
          detail: rows ? `rows:${rows.join(',')}` : reason,
        },
      });
      await tx.scoreEvent.create({
        data: {
          roomId,
          participantId,
          roundId: rt.currentRound?.roundId ?? null,
          type: accepted ? (type === 'LINE' ? 'LINE_BONUS' : 'BINGO_BONUS') : 'WRONG_CLAIM',
          points,
        },
      });
    });
    rt.scores.set(participantId, (rt.scores.get(participantId) ?? 0) + points);

    const resultPayload = { participantId, alias, type, accepted, reason, rows };
    this.emitRoom(rt, accepted ? 'claim:accepted' : 'claim:rejected', resultPayload);
    const leaderboard = await this.leaderboard(roomId);
    this.emitRoom(rt, 'leaderboard:updated', { leaderboard });

    if (accepted && type === 'LINE' && !rt.lineClaimed) {
      rt.lineClaimed = true;
      await this.addHighlight(rt, 'FIRST_LINE', participantId, rt.currentRound?.index ?? null, {});
    }
    if (accepted && type === 'BINGO') {
      await this.addHighlight(rt, 'BINGO', participantId, rt.currentRound?.index ?? null, {});
      await this.finish(roomId);
    }

    return { accepted, reason, rows };
  }

  /** Restaura el runtime mínimo tras reinicio del proceso (sala en curso). */
  async ensureRuntime(roomId: string): Promise<void> {
    if (this.rooms.has(roomId)) return;
    const room = await this.prisma.room.findUnique({ where: { id: roomId } });
    if (!room || !['PLAYING', 'PAUSED', 'ROUND_RESULTS'].includes(room.status)) return;
    this.logger.warn(`Sala ${roomId} activa sin runtime; se marca como pausada para el anfitrión`);
  }
}
