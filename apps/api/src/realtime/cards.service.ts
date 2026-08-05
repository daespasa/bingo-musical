import { Injectable } from '@nestjs/common';
import { CARD_ALGORITHM_VERSION, generateCard, type CardTrack, type CardView } from '@bingo/shared';
import type { BingoCard, BingoCardCell } from '@bingo/database';
import { PrismaService } from '../prisma.service';

@Injectable()
export class CardsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Genera y persiste cartones para todos los jugadores de la sala.
   * Semilla reproducible: roomId:participantId:v{algo}.
   */
  async generateForRoom(
    roomId: string,
    tracks: CardTrack[],
    size: 3 | 4 | 5,
    freeCenter: boolean,
  ): Promise<void> {
    const players = await this.prisma.roomParticipant.findMany({
      where: { roomId, role: 'PLAYER', kickedAt: null, card: null },
    });
    for (const player of players) {
      const seed = `${roomId}:${player.id}:v${CARD_ALGORITHM_VERSION}`;
      const cells = generateCard({ tracks, size, freeCenter, seed });
      await this.prisma.bingoCard.create({
        data: {
          roomId,
          participantId: player.id,
          size,
          seed,
          algorithmVersion: CARD_ALGORITHM_VERSION,
          cells: {
            create: cells.map((c) => ({
              position: c.position,
              trackId: c.trackId,
              displayTitle: c.displayTitle,
              displayArtist: c.displayArtist,
              isFree: c.isFree,
              status: c.isFree ? 'VALID' : 'UNMARKED',
            })),
          },
        },
      });
    }
  }

  async getForParticipant(participantId: string): Promise<CardView | null> {
    const card = await this.prisma.bingoCard.findUnique({
      where: { participantId },
      include: { cells: { orderBy: { position: 'asc' } } },
    });
    if (!card) return null;
    return this.toView(card);
  }

  toView(card: BingoCard & { cells: BingoCardCell[] }): CardView {
    return {
      id: card.id,
      size: card.size,
      cells: card.cells.map((c) => ({
        id: c.id,
        position: c.position,
        displayTitle: c.displayTitle,
        displayArtist: c.displayArtist,
        isFree: c.isFree,
        status: c.status,
      })),
    };
  }
}
