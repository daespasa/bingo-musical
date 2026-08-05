import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Game, GameSettings, Prisma } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { CreateGameDto } from './games.dto';

@Injectable()
export class GamesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateGameDto): Promise<Game> {
    const collection = await this.prisma.musicCollection.findFirst({
      where: { id: dto.collectionId, OR: [{ isDemo: true }, { ownerId }] },
      include: { _count: { select: { tracks: true } } },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');
    if (collection._count.tracks < 9) {
      throw new ForbiddenException('La colección necesita al menos 9 canciones');
    }
    return this.prisma.game.create({
      data: {
        name: dto.name.trim(),
        status: 'READY',
        ownerId,
        collectionId: collection.id,
        settings: { create: { ...dto.settings } },
      },
    });
  }

  async listForOwner(ownerId: string) {
    const games = await this.prisma.game.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: {
        collection: { select: { name: true } },
        rooms: {
          where: { status: { in: ['LOBBY', 'COUNTDOWN', 'PLAYING', 'PAUSED', 'ROUND_RESULTS'] } },
          select: { code: true },
          take: 1,
        },
      },
    });
    return games.map((g) => ({
      id: g.id,
      name: g.name,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      collectionName: g.collection.name,
      activeRoomCode: g.rooms[0]?.code ?? null,
    }));
  }

  async getOwned(
    ownerId: string,
    gameId: string,
  ): Promise<Game & { settings: GameSettings | null }> {
    const game = await this.prisma.game.findFirst({
      where: { id: gameId, ownerId },
      include: { settings: true },
    });
    if (!game) throw new NotFoundException('Partida no encontrada');
    return game;
  }

  async detail(ownerId: string, gameId: string) {
    const game = await this.prisma.game.findFirst({
      where: { id: gameId, ownerId },
      include: {
        settings: true,
        collection: { include: { _count: { select: { tracks: true } } } },
        rooms: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, code: true, status: true, mode: true, createdAt: true },
        },
      },
    });
    if (!game) throw new NotFoundException('Partida no encontrada');
    return {
      id: game.id,
      name: game.name,
      status: game.status,
      createdAt: game.createdAt.toISOString(),
      collection: {
        id: game.collection.id,
        name: game.collection.name,
        trackCount: game.collection._count.tracks,
      },
      settings: game.settings,
      rooms: game.rooms.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    };
  }

  async duplicate(ownerId: string, gameId: string): Promise<Game> {
    const game = await this.getOwned(ownerId, gameId);
    const settings = game.settings;
    const settingsData: Prisma.GameSettingsCreateWithoutGameInput = settings
      ? {
          cardSize: settings.cardSize,
          freeCenter: settings.freeCenter,
          snippetDurationMs: settings.snippetDurationMs,
          answerWindowMs: settings.answerWindowMs,
          autoReveal: settings.autoReveal,
          autoAdvance: settings.autoAdvance,
          roundResultsMs: settings.roundResultsMs,
          lineEnabled: settings.lineEnabled,
          bingoEnabled: settings.bingoEnabled,
          showLeaderboard: settings.showLeaderboard,
          shuffleTracks: settings.shuffleTracks,
          correctMarkPoints: settings.correctMarkPoints,
          speedBonusMax: settings.speedBonusMax,
          streakBonusPoints: settings.streakBonusPoints,
          linePoints: settings.linePoints,
          bingoPoints: settings.bingoPoints,
          wrongMarkPenalty: settings.wrongMarkPenalty,
          wrongClaimPenalty: settings.wrongClaimPenalty,
        }
      : {};
    return this.prisma.game.create({
      data: {
        name: `${game.name} (copia)`,
        status: 'READY',
        ownerId,
        collectionId: game.collectionId,
        settings: { create: settingsData },
      },
    });
  }

  async history(ownerId: string) {
    const results = await this.prisma.gameResult.findMany({
      where: { room: { game: { ownerId } } },
      orderBy: { finishedAt: 'desc' },
      include: {
        room: {
          select: {
            id: true,
            code: true,
            game: { select: { name: true } },
            _count: { select: { participants: true } },
          },
        },
        winner: { select: { alias: true } },
      },
    });
    return results.map((r) => ({
      roomId: r.room.id,
      gameName: r.room.game.name,
      code: r.room.code,
      finishedAt: r.finishedAt.toISOString(),
      durationMs: r.durationMs,
      participants: r.room._count.participants,
      winnerAlias: r.winner?.alias ?? null,
    }));
  }
}
