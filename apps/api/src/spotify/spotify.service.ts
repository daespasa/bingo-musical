import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { normalizeText } from '@bingo/shared';
import type { PreviewProvider } from '@bingo/music-providers';
import { PREVIEW_PROVIDER } from './preview-provider.token';
import { PrismaService } from '../prisma.service';
import { SpotifyApiService, type SpotifyTrack } from './spotify-api.service';

export type ImportedTrack = {
  trackId: string;
  title: string;
  artist: string;
  album: string;
  coverUrl: string | null;
  durationMs: number;
  previewStatus: string;
  previewUrl: string | null;
  confidence: number;
};

@Injectable()
export class SpotifyService {
  private readonly logger = new Logger(SpotifyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spotify: SpotifyApiService,
    @Inject(PREVIEW_PROVIDER) private readonly previews: PreviewProvider,
  ) {}

  /** Crea o reutiliza la pista local que refleja una canción de Spotify. */
  private async upsertTrack(t: SpotifyTrack): Promise<string> {
    const artistName = t.artists[0] ?? 'Desconocido';
    const artist = await this.prisma.artist.upsert({
      where: { normalizedName: normalizeText(artistName) },
      update: {},
      create: { name: artistName, normalizedName: normalizeText(artistName) },
    });

    const existingRef = await this.prisma.externalTrackReference.findUnique({
      where: { provider_externalId: { provider: 'SPOTIFY', externalId: t.spotifyTrackId } },
    });
    if (existingRef) return existingRef.trackId;

    const album = await this.prisma.album.create({
      data: { title: t.album, coverUrl: t.coverUrl },
    });
    const track = await this.prisma.track.create({
      data: {
        title: t.title,
        normalizedTitle: normalizeText(t.title),
        artistId: artist.id,
        albumId: album.id,
        durationMs: t.durationMs,
        source: 'SPOTIFY',
        externalRefs: {
          create: {
            provider: 'SPOTIFY',
            externalId: t.spotifyTrackId,
            url: t.externalUrl,
          },
        },
      },
    });
    return track.id;
  }

  /**
   * Resuelve la preview de una pista y persiste el resultado con su
   * confianza y fecha de validación.
   */
  private async resolvePreview(
    trackId: string,
    t: SpotifyTrack,
  ): Promise<{ status: string; url: string | null; confidence: number }> {
    const existing = await this.prisma.trackPreview.findUnique({
      where: { trackId_provider: { trackId, provider: 'SPOTIFY_PREVIEW_FINDER' } },
    });
    if (existing?.status === 'AVAILABLE' && existing.url) {
      return { status: existing.status, url: existing.url, confidence: existing.confidence };
    }

    const resolution = await this.previews.resolve({
      spotifyTrackId: t.spotifyTrackId,
      title: t.title,
      artist: t.artists[0] ?? '',
      durationMs: t.durationMs,
    });

    const data =
      resolution.status === 'AVAILABLE'
        ? {
            status: 'AVAILABLE' as const,
            url: resolution.url,
            durationMs: resolution.durationMs,
            confidence: resolution.confidence,
            lastValidatedAt: resolution.resolvedAt,
          }
        : {
            status: resolution.status,
            url: null,
            durationMs: null,
            confidence: 0,
            lastValidatedAt: new Date(),
          };

    await this.prisma.trackPreview.upsert({
      where: { trackId_provider: { trackId, provider: 'SPOTIFY_PREVIEW_FINDER' } },
      update: data,
      create: { trackId, provider: 'SPOTIFY_PREVIEW_FINDER', ...data },
    });
    return { status: data.status, url: data.url, confidence: data.confidence };
  }

  async search(query: string): Promise<SpotifyTrack[]> {
    return this.spotify.searchTracks(query);
  }

  /**
   * Importa una lista en dos fases. Primero guarda los metadatos, que son
   * segundos, y devuelve la colección ya usable. El audio se resuelve después
   * en segundo plano, porque tarda del orden de un segundo por canción y una
   * lista larga convertiría esto en una petición que muere por el camino.
   */
  async importPlaylist(
    ownerId: string,
    playlistRef: string,
    collectionName: string,
  ): Promise<{ collectionId: string; imported: number; skipped: number; total: number }> {
    const playlistId = SpotifyApiService.parsePlaylistId(playlistRef);
    if (!playlistId) {
      throw new BadRequestException('Ese enlace no parece una lista de Spotify');
    }
    const { tracks: spotifyTracks, total, skipped } = await this.spotify.playlistTracks(playlistId);
    this.logger.log(
      `Importando ${spotifyTracks.length} de ${total} canciones de la playlist ${playlistId}`,
    );

    const collection = await this.prisma.musicCollection.create({
      data: {
        name: collectionName || 'Playlist importada',
        description: `Importada de Spotify (${spotifyTracks.length} canciones)`,
        ownerId,
      },
    });

    let position = 0;
    for (const t of spotifyTracks) {
      const trackId = await this.upsertTrack(t);
      await this.prisma.musicCollectionTrack.upsert({
        where: { collectionId_trackId: { collectionId: collection.id, trackId } },
        update: {},
        create: { collectionId: collection.id, trackId, position: position++ },
      });
    }

    void this.resolveInBackground(collection.id, ownerId);

    return { collectionId: collection.id, imported: spotifyTracks.length, skipped, total };
  }

  /**
   * Añade una canción suelta a una colección propia y resuelve su audio al
   * momento: es una sola, así que no compensa mandarla a segundo plano.
   */
  async addTrackToCollection(
    ownerId: string,
    collectionId: string,
    spotifyTrackId: string,
  ): Promise<{ trackId: string; previewStatus: string }> {
    const collection = await this.prisma.musicCollection.findFirst({
      where: { id: collectionId, ownerId, isDemo: false },
    });
    if (!collection) throw new NotFoundException('Esa colección no es tuya o ya no existe');

    const track = await this.spotify.trackById(spotifyTrackId);
    if (!track) throw new NotFoundException('No se encontró esa canción en Spotify');

    const trackId = await this.upsertTrack(track);
    const already = await this.prisma.musicCollectionTrack.findUnique({
      where: { collectionId_trackId: { collectionId, trackId } },
    });
    if (already) throw new ConflictException('Esa canción ya está en la colección');

    const last = await this.prisma.musicCollectionTrack.findFirst({
      where: { collectionId },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    await this.prisma.musicCollectionTrack.create({
      data: { collectionId, trackId, position: (last?.position ?? -1) + 1 },
    });

    const preview = await this.resolvePreview(trackId, track);
    return { trackId, previewStatus: preview.status };
  }

  /** Colecciones cuyo audio se está resolviendo ahora mismo. */
  private readonly resolving = new Set<string>();

  isResolving(collectionId: string): boolean {
    return this.resolving.has(collectionId);
  }

  /**
   * Resuelve el audio sin bloquear a quien importa. Si la API se reinicia a
   * mitad, la resolución se corta: se retoma desde la pantalla de la colección
   * o en la revalidación previa a empezar la partida.
   */
  async resolveInBackground(collectionId: string, ownerId: string): Promise<void> {
    if (this.resolving.has(collectionId)) return;
    this.resolving.add(collectionId);
    try {
      const resolved = await this.resolvePreviews(collectionId, ownerId);
      const playable = resolved.filter((t) => t.previewUrl).length;
      this.logger.log(`Colección ${collectionId}: suenan ${playable} de ${resolved.length}`);
    } catch (error) {
      this.logger.error(
        `No se pudo resolver el audio de la colección ${collectionId}`,
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.resolving.delete(collectionId);
    }
  }

  /** Revalida las previews de una colección antes de empezar la partida. */
  async resolvePreviews(collectionId: string, ownerId: string): Promise<ImportedTrack[]> {
    const collection = await this.prisma.musicCollection.findFirst({
      where: { id: collectionId, ownerId },
      include: {
        tracks: {
          orderBy: { position: 'asc' },
          include: {
            track: { include: { artist: true, album: true, externalRefs: true, previews: true } },
          },
        },
      },
    });
    if (!collection) throw new NotFoundException('Colección no encontrada');

    const results: ImportedTrack[] = [];
    for (const ct of collection.tracks) {
      const track = ct.track;
      const ref = track.externalRefs.find((r) => r.provider === 'SPOTIFY');
      const preview = await this.resolvePreview(track.id, {
        spotifyTrackId: ref?.externalId ?? '',
        title: track.title,
        artists: [track.artist.name],
        album: track.album?.title ?? '',
        coverUrl: track.album?.coverUrl ?? null,
        durationMs: track.durationMs ?? 0,
        externalUrl: ref?.url ?? '',
      });
      results.push({
        trackId: track.id,
        title: track.title,
        artist: track.artist.name,
        album: track.album?.title ?? '',
        coverUrl: track.album?.coverUrl ?? null,
        durationMs: track.durationMs ?? 0,
        previewStatus: preview.status,
        previewUrl: preview.url,
        confidence: preview.confidence,
      });
    }
    return results;
  }
}
