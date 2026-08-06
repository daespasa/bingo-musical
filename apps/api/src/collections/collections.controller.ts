import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { User } from '@bingo/database';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { PrismaService } from '../prisma.service';
import { CollectionsService } from './collections.service';
import {
  CreateCollectionDto,
  DuplicateCollectionDto,
  ReorderTracksDto,
  UpdateCollectionDto,
} from './collections.dto';

export type CollectionSummary = {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  trackCount: number;
  /** Si esta persona puede cambiarla; las de la aplicación no se tocan. */
  editable: boolean;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly collections: CollectionsService,
  ) {}

  @Post()
  create(@CurrentUser() user: User, @Body() dto: CreateCollectionDto): Promise<{ id: string }> {
    return this.collections.create(user.id, dto.name, dto.description);
  }

  @Post(':id/duplicate')
  duplicate(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: DuplicateCollectionDto,
  ): Promise<{ id: string }> {
    return this.collections.duplicate(id, user.id, dto.name);
  }

  @Patch(':id')
  @HttpCode(204)
  async update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateCollectionDto,
  ): Promise<void> {
    await this.collections.rename(id, user.id, dto.name, dto.description ?? null);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('id') id: string): Promise<void> {
    await this.collections.remove(id, user.id);
  }

  @Delete(':id/tracks/:trackId')
  @HttpCode(204)
  async removeTrack(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Param('trackId') trackId: string,
  ): Promise<void> {
    await this.collections.removeTrack(id, user.id, trackId);
  }

  @Patch(':id/tracks/order')
  @HttpCode(204)
  async reorder(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: ReorderTracksDto,
  ): Promise<void> {
    await this.collections.reorder(id, user.id, dto.trackIds);
  }

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
      editable: !c.isDemo && c.ownerId === user.id,
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
      editable: !c.isDemo && c.ownerId === user.id,
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
