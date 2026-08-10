import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt, randomUUID } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, sanitizeAlias, normalizeText } from '@bingo/shared';
import type { Room } from '@bingo/database';
import { PrismaService } from '../prisma.service';
import { GuestTokenService } from './guest-token.service';
import { GamesService } from '../games/games.service';

const ROOM_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas
const GUEST_TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

export type PublicRoom = {
  id: string;
  code: string;
  mode: string;
  status: string;
  gameName: string;
  cardSize: number;
  participantCount: number;
  locked: boolean;
};

@Injectable()
export class RoomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly guestTokens: GuestTokenService,
    private readonly games: GamesService,
  ) {}

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
      code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
    }
    return code;
  }

  /**
   * Revancha: misma partida, sala nueva.
   *
   * Duplica la partida en lugar de reabrir la anterior, para que el historial
   * de la que acaba de terminar quede intacto: sus rondas, su ranking y su
   * resultado siguen siendo consultables.
   */
  async rematch(hostId: string, code: string, mode: 'PROJECTOR' | 'REMOTE'): Promise<Room> {
    const previous = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: { game: true },
    });
    if (!previous) throw new NotFoundException('Sala no encontrada');
    if (previous.hostId !== hostId) {
      throw new ForbiddenException('Solo el anfitrión puede convocar la revancha');
    }

    // La copia conserva modo, configuración, colección y reglas.
    const copy = await this.games.duplicate(hostId, previous.gameId);
    return this.create(hostId, copy.id, mode);
  }

  async create(hostId: string, gameId: string, mode: 'PROJECTOR' | 'REMOTE'): Promise<Room> {
    const game = await this.prisma.game.findFirst({
      where: { id: gameId, ownerId: hostId },
      include: { settings: true },
    });
    if (!game) throw new NotFoundException('Partida no encontrada');

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await this.prisma.room.create({
          data: {
            code: this.generateCode(),
            gameId: game.id,
            hostId,
            mode,
            status: 'LOBBY',
            expiresAt: new Date(Date.now() + ROOM_TTL_MS),
          },
        });
      } catch {
        // colisión de código; reintentar
      }
    }
    throw new ConflictException('No se pudo generar un código de sala');
  }

  async findByCode(code: string): Promise<PublicRoom> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        game: { select: { name: true, settings: { select: { cardSize: true } } } },
        _count: { select: { participants: { where: { kickedAt: null, role: 'PLAYER' } } } },
      },
    });
    if (!room || room.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Sala no encontrada o caducada');
    }
    return {
      id: room.id,
      code: room.code,
      mode: room.mode,
      status: room.status,
      gameName: room.game.name,
      cardSize: room.game.settings?.cardSize ?? 3,
      participantCount: room._count.participants,
      locked: room.lockedAt !== null,
    };
  }

  async join(
    code: string,
    rawAlias: string,
    userAgent?: string,
  ): Promise<{ participantId: string; roomId: string; alias: string; token: string }> {
    const alias = sanitizeAlias(rawAlias);
    if (!alias) {
      throw new ForbiddenException('Alias no válido (2-20 caracteres, sin símbolos raros)');
    }
    const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room || room.expiresAt.getTime() < Date.now()) {
      throw new NotFoundException('Sala no encontrada o caducada');
    }
    if (room.lockedAt) throw new ForbiddenException('La sala está bloqueada');
    if (!['LOBBY', 'COUNTDOWN'].includes(room.status)) {
      throw new ForbiddenException('La partida ya ha empezado');
    }

    const participant = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.roomParticipant.findUnique({
        where: {
          roomId_aliasNormalized: { roomId: room.id, aliasNormalized: normalizeText(alias) },
        },
      });
      if (existing) throw new ConflictException('Ese alias ya está en uso en la sala');
      return tx.roomParticipant.create({
        data: {
          roomId: room.id,
          alias,
          aliasNormalized: normalizeText(alias),
          role: 'PLAYER',
          devices: { create: { userAgent: userAgent?.slice(0, 255) } },
          audioReadiness: { create: {} },
        },
      });
    });

    const token = this.guestTokens.sign({
      participantId: participant.id,
      roomId: room.id,
      exp: Date.now() + GUEST_TOKEN_TTL_MS,
    });
    // Registrar sesión de invitado (hash) para poder revocarla
    await this.prisma.playerSession.create({
      data: {
        participantId: participant.id,
        tokenHash: createHash('sha256')
          .update(token + randomUUID())
          .digest('hex'),
        expiresAt: new Date(Date.now() + GUEST_TOKEN_TTL_MS),
      },
    });

    return { participantId: participant.id, roomId: room.id, alias, token };
  }

  async result(code: string): Promise<Record<string, unknown>> {
    const room = await this.prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        game: { select: { name: true } },
        result: { include: { winner: { select: { alias: true } } } },
        highlights: { include: { participant: { select: { alias: true } } } },
      },
    });
    if (!room?.result) throw new NotFoundException('Resultados no disponibles');
    return {
      gameName: room.game.name,
      code: room.code,
      finishedAt: room.result.finishedAt.toISOString(),
      durationMs: room.result.durationMs,
      totalRounds: room.result.totalRounds,
      winnerAlias: room.result.winner?.alias ?? null,
      summary: room.result.summary,
      highlights: room.highlights.map((h) => ({
        type: h.type,
        alias: h.participant?.alias ?? '???',
        roundIndex: h.roundIndex,
        data: h.data,
      })),
    };
  }

  /** Genera un token efímero de host para el handshake del WebSocket. */
  hostSocketToken(roomId: string, hostParticipantId: string): string {
    return this.guestTokens.sign({
      participantId: hostParticipantId,
      roomId,
      exp: Date.now() + GUEST_TOKEN_TTL_MS,
    });
  }

  async ensureHostParticipant(
    hostUserId: string,
    code: string,
  ): Promise<{ room: Room; participantId: string; token: string }> {
    const room = await this.prisma.room.findUnique({ where: { code: code.toUpperCase() } });
    if (!room) throw new NotFoundException('Sala no encontrada');
    if (room.hostId !== hostUserId) throw new ForbiddenException('No eres el anfitrión');

    let participant = await this.prisma.roomParticipant.findFirst({
      where: { roomId: room.id, role: 'HOST', userId: hostUserId },
    });
    if (!participant) {
      const user = await this.prisma.user.findUniqueOrThrow({ where: { id: hostUserId } });
      participant = await this.prisma.roomParticipant.create({
        data: {
          roomId: room.id,
          role: 'HOST',
          alias: user.displayName.slice(0, 20),
          aliasNormalized: `host-${randomBytes(4).toString('hex')}`,
          userId: hostUserId,
        },
      });
    }
    const token = this.hostSocketToken(room.id, participant.id);
    return { room, participantId: participant.id, token };
  }
}
