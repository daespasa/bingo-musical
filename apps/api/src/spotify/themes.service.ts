import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SpotifyApiService, type SpotifyTrack } from './spotify-api.service';
import { SpotifyService } from './spotify.service';
import {
  CANDIDATES_PER_THEME,
  THEMES,
  type Theme,
  type ThemeOutcome,
  shouldPublish,
} from './themes';

@Injectable()
export class ThemesService {
  private readonly logger = new Logger(ThemesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: SpotifyApiService,
    private readonly spotify: SpotifyService,
  ) {}

  /** Construye o refresca todas las temáticas. */
  async buildAll(): Promise<ThemeOutcome[]> {
    if (!this.api.isConfigured()) {
      this.logger.warn('Spotify no está configurado: no se construye ninguna temática');
      return THEMES.map((t) => ({
        key: t.key,
        status: 'failed' as const,
        reason: 'Spotify no está configurado',
      }));
    }
    const outcomes: ThemeOutcome[] = [];
    for (const theme of THEMES) {
      outcomes.push(await this.build(theme));
    }
    return outcomes;
  }

  async build(theme: Theme): Promise<ThemeOutcome> {
    let candidates: SpotifyTrack[];
    try {
      candidates = await this.gather(theme);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Tema ${theme.key}: no se pudo buscar (${reason})`);
      return { key: theme.key, status: 'failed', reason };
    }

    // Solo entran las que de verdad suenan: una temática que no suena no vale
    const playable: Array<{ trackId: string }> = [];
    let discarded = 0;
    for (const candidate of candidates) {
      const trackId = await this.spotify.upsertPublicTrack(candidate);
      const preview = await this.spotify.resolvePublicPreview(trackId, candidate);
      if (preview.status === 'AVAILABLE' && preview.url) {
        playable.push({ trackId });
      } else {
        discarded++;
      }
    }

    if (!shouldPublish(playable.length)) {
      const reason = `solo suenan ${playable.length}`;
      this.logger.warn(`Tema ${theme.key}: se conserva la versión anterior (${reason})`);
      return { key: theme.key, status: 'kept', playable: playable.length, reason };
    }

    // Se sustituye entera y de golpe para que nadie vea el tema a medias
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.musicCollection.findUnique({ where: { themeKey: theme.key } });
      const collection = existing
        ? await tx.musicCollection.update({
            where: { id: existing.id },
            data: { name: theme.name, description: theme.description, refreshedAt: new Date() },
          })
        : await tx.musicCollection.create({
            data: {
              name: theme.name,
              description: theme.description,
              themeKey: theme.key,
              isDemo: true, // de la aplicación: se ve, no se toca
              refreshedAt: new Date(),
            },
          });

      await tx.musicCollectionTrack.deleteMany({ where: { collectionId: collection.id } });
      await tx.musicCollectionTrack.createMany({
        data: playable.map((p, position) => ({
          collectionId: collection.id,
          trackId: p.trackId,
          position,
        })),
      });
    });

    this.logger.log(`Tema ${theme.key}: ${playable.length} canciones, ${discarded} descartadas`);
    return { key: theme.key, status: 'built', playable: playable.length, discarded };
  }

  /** Junta candidatas de todas las consultas del tema, sin repetir. */
  private async gather(theme: Theme): Promise<SpotifyTrack[]> {
    const seen = new Map<string, SpotifyTrack>();
    const perQuery = Math.ceil(CANDIDATES_PER_THEME / theme.queries.length);
    for (const query of theme.queries) {
      for (let offset = 0; offset < perQuery; offset += 50) {
        const batch = await this.api.searchTracks(query, Math.min(50, perQuery - offset), offset);
        if (batch.length === 0) break;
        for (const track of batch) seen.set(track.spotifyTrackId, track);
      }
    }
    return [...seen.values()].slice(0, CANDIDATES_PER_THEME);
  }
}
