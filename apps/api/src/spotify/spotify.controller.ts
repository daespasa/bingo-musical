import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '@bingo/database';
import { AuthGuard, CurrentUser } from '../auth/auth.guard';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyService, type ImportedTrack } from './spotify.service';
import { ImportPlaylistDto, ResolvePreviewsDto, SearchQueryDto } from './spotify.dto';

@ApiTags('spotify')
@Controller('spotify')
export class SpotifyController {
  constructor(
    private readonly spotify: SpotifyService,
    private readonly api: SpotifyApiService,
  ) {}

  /** Permite a la web ocultar la búsqueda cuando no hay credenciales. */
  @Get('status')
  status(): { configured: boolean } {
    return { configured: this.api.isConfigured() };
  }

  @Get('search')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  search(@Query() query: SearchQueryDto) {
    return this.spotify.search(query.q);
  }

  @Post('import-playlist')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  importPlaylist(
    @CurrentUser() user: User,
    @Body() dto: ImportPlaylistDto,
  ): Promise<{ collectionId: string; tracks: ImportedTrack[] }> {
    return this.spotify.importPlaylist(user.id, dto.playlist, dto.name ?? 'Playlist importada');
  }

  @Post('resolve-previews')
  @UseGuards(AuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  resolvePreviews(
    @CurrentUser() user: User,
    @Body() dto: ResolvePreviewsDto,
  ): Promise<ImportedTrack[]> {
    return this.spotify.resolvePreviews(dto.collectionId, user.id);
  }
}
