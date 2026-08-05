import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { User } from '@bingo/database';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma.service';

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  trackCount: number;
};

export type CollectionDetail = CollectionSummary & {
  tracks: Array<{
    id: string;
    position: number;
    title: string;
    artist: string;
    durationMs: number | null;
    previewUrl: string | null;
    previewStatus: string | null;
  }>;
};

@ApiTags('collections')
@Controller('collections')
@UseGuards(AuthGuard)
export class CollectionsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: User): Promise<CollectionSummary[]> {
    const collections = await this.prisma.musicCollection.findMany({
      where: { OR: [{ isDemo: true }, { ownerId: user.id }] },
      include: { _count: { select: { tracks: true } } },
      orderBy: [{ isDemo: 'desc' }, { createdAt: 'desc' }],
    });
    return collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      isDemo: c.isDemo,
      trackCount: c._count.tracks,
    }));
  }

  @Get(':id')
  async detail(@CurrentUser() user: User, @Param('id') id: string): Promise<CollectionDetail> {
    const c = await this.prisma.musicCollection.findFirst({
      where: { id, OR: [{ isDemo: true }, { ownerId: user.id }] },
      include: {
        _count: { select: { tracks: true } },
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: { include: { artist: true, previews: true } },
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Colección no encontrada');
    return {
      id: c.id,
      name: c.name,
      description: c.description,
      isDemo: c.isDemo,
      trackCount: c._count.tracks,
      tracks: c.tracks.map((ct) => {
        const preview =
          ct.track.previews.find((p) => p.status === 'AVAILABLE') ?? ct.track.previews[0] ?? null;
        return {
          id: ct.track.id,
          position: ct.position,
          title: ct.track.title,
          artist: ct.track.artist.name,
          durationMs: ct.track.durationMs,
          previewUrl: preview?.url ?? null,
          previewStatus: preview?.status ?? null,
        };
      }),
    };
  }
}
