import { Injectable } from '@nestjs/common';
import { readGameModeConfig, type RoomStatePayload } from '@bingo/shared';
import { PrismaService } from '../prisma.service';
import { CardsService } from './cards.service';
import { GameEngineService } from './game-engine.service';

@Injectable()
export class RoomStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: CardsService,
    private readonly engine: GameEngineService,
  ) {}

  async build(
    roomId: string,
    forParticipantId: string,
    connectedIds: ReadonlySet<string>,
  ): Promise<RoomStatePayload | null> {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
      include: {
        game: { include: { settings: true } },
        participants: {
          where: { kickedAt: null },
          include: { audioReadiness: true },
        },
      },
    });
    if (!room) return null;
    const settings = room.game.settings;
    const leaderboard = await this.engine.leaderboard(roomId);
    const scoreById = new Map(leaderboard.map((e) => [e.participantId, e.score]));
    const card = await this.cards.getForParticipant(forParticipantId);

    return {
      roomId: room.id,
      code: room.code,
      mode: room.mode,
      status: room.status,
      gameName: room.game.name,
      settings: {
        cardSize: settings?.cardSize ?? 3,
        snippetDurationMs: settings?.snippetDurationMs ?? 15000,
        answerWindowMs: settings?.answerWindowMs ?? 10000,
        autoReveal: settings?.autoReveal ?? true,
        autoAdvance: settings?.autoAdvance ?? true,
        lineEnabled: settings?.lineEnabled ?? true,
        bingoEnabled: settings?.bingoEnabled ?? true,
        showLeaderboard: settings?.showLeaderboard ?? true,
        // La configuración se lee con el modo real de la partida: leerla
        // siempre como bingo hacía que una partida de quiz reventara aquí y la
        // sala se quedara sin estado. `revealMode` solo significa algo en
        // bingo; en los demás modos se manda el valor neutro.
        revealMode:
          room.game.mode === 'MUSIC_BINGO'
            ? readGameModeConfig('MUSIC_BINGO', room.game.modeConfig).revealMode
            : 'HIDDEN_UNTIL_REVEAL',
      },
      gameMode: room.game.mode,
      // Las vidas salen del runtime, que es la autoridad; reconectar no las
      // devuelve ni resucita a nadie.
      survivalStandings: this.engine.survivalStandingsView(roomId),
      myLives: this.engine.livesFor(roomId, forParticipantId),
      participants: room.participants.map((p) => ({
        id: p.id,
        alias: p.alias,
        role: p.role,
        connected: connectedIds.has(p.id),
        audioStatus: p.audioReadiness?.status ?? 'NOT_ENABLED',
        score: scoreById.get(p.id) ?? 0,
      })),
      round: this.engine.roundView(roomId, forParticipantId),
      leaderboard,
      card,
      locked: room.lockedAt !== null,
    };
  }
}
