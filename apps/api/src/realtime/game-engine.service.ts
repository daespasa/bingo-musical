import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import {
  completedRows,
  createRng,
  effectiveValidPositions,
  isFullCard,
  seededShuffle,
  type CardTrack,
  type GameFinishedPayload,
  type HighlightPayload,
  readGameModeConfig,
  type LeaderboardEntry,
  type MusicBingoConfig,
  type RoundView,
} from '@bingo/shared';
import type { GameSettings, HighlightType } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { GameModeRegistry } from '../game-modes/game-mode.registry';
import { revealedInfo } from '../game-modes/music-bingo.handler';
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
  tracks: Map<string, CardTrack & { previewUrl: string }>;
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

  roundView(roomId: string): RoundView | null {
    const rt = this.rooms.get(roomId);
    if (!rt?.currentRound) return null;
    const r = rt.currentRound;
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
                  include: { track: { include: { artist: true, previews: true } } },
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
    const bingoConfig = this.modes.validateConfig(
      'MUSIC_BINGO',
      readGameModeConfig('MUSIC_BINGO', room.game.modeConfig),
    );

    const tracks = new Map<string, CardTrack & { previewUrl: string }>();
    for (const ct of room.game.collection.tracks) {
      const preview = ct.track.previews.find((p) => p.status === 'AVAILABLE' && p.url);
      if (!preview?.url) continue;
      tracks.set(ct.track.id, {
        id: ct.track.id,
        title: ct.track.title,
        artist: ct.track.artist.name,
        previewUrl: preview.url,
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
      }
    }
    this.rooms.set(roomId, rt);

    // Generar cartones y bloquear la sala
    const size = settings.cardSize as 3 | 4 | 5;
    await this.cards.generateForRoom(roomId, pool, size, settings.freeCenter);
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
    };
    rt.phase = 'PREPARING_AUDIO';

    this.emitRoom(rt, 'round:prepare', {
      roundId: round.id,
      index,
      totalRounds: rt.order.length,
      previewUrl: track.previewUrl,
      // En bingo a ciegas esto es `null` y el título no sale del servidor
      // hasta el reveal: mandarlo antes sería regalar la respuesta.
      revealed: revealedInfo(rt.bingoConfig, track),
    });

    // Programar cuando todos estén listos o venza el timeout
    this.after(rt, PRELOAD_TIMEOUT_MS, () => void this.scheduleRound(rt));
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
    this.emitRoom(rt, 'round:revealed', {
      roundId: r.roundId,
      index: r.index,
      title: r.title,
      artist: r.artist,
    });

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
