import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { loadEnv } from '../config/env';

export type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  artists: string[];
  album: string;
  coverUrl: string | null;
  durationMs: number;
  externalUrl: string;
};

type TokenState = { accessToken: string; expiresAt: number };

type SpotifyApiTrack = {
  id: string;
  name: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: { name: string; images: Array<{ url: string }> };
  external_urls: { spotify: string };
};

/**
 * Cliente de la Spotify Web API con Client Credentials.
 * Las credenciales viven solo aquí; nunca llegan al navegador.
 */
@Injectable()
export class SpotifyApiService {
  private readonly logger = new Logger(SpotifyApiService.name);
  private token: TokenState | null = null;

  isConfigured(): boolean {
    const env = loadEnv();
    return Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException(
        'Spotify no está configurado. Añade SPOTIFY_CLIENT_ID y SPOTIFY_CLIENT_SECRET al .env',
      );
    }
  }

  private async accessToken(): Promise<string> {
    this.assertConfigured();
    if (this.token && this.token.expiresAt > Date.now() + 30_000) {
      return this.token.accessToken;
    }
    const env = loadEnv();
    const credentials = Buffer.from(
      `${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`,
    ).toString('base64');

    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      this.logger.error(`No se pudo obtener token de Spotify: ${res.status}`);
      throw new ServiceUnavailableException('No se pudo autenticar contra Spotify');
    }
    const body = (await res.json()) as { access_token: string; expires_in: number };
    this.token = {
      accessToken: body.access_token,
      expiresAt: Date.now() + body.expires_in * 1000,
    };
    return this.token.accessToken;
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.accessToken();
    const res = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429) {
      throw new ServiceUnavailableException('Spotify está limitando las peticiones, prueba luego');
    }
    if (!res.ok) {
      throw new ServiceUnavailableException(`Spotify respondió ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  private toTrack(t: SpotifyApiTrack): SpotifyTrack {
    return {
      spotifyTrackId: t.id,
      title: t.name,
      artists: t.artists.map((a) => a.name),
      album: t.album.name,
      coverUrl: t.album.images[0]?.url ?? null,
      durationMs: t.duration_ms,
      externalUrl: t.external_urls.spotify,
    };
  }

  async searchTracks(query: string, limit = 20): Promise<SpotifyTrack[]> {
    const body = await this.get<{ tracks: { items: SpotifyApiTrack[] } }>(
      `/search?type=track&limit=${Math.min(limit, 50)}&q=${encodeURIComponent(query)}`,
    );
    return body.tracks.items.map((t) => this.toTrack(t));
  }

  /** Extrae el ID de una URL, URI o ID pelado de playlist. */
  static parsePlaylistId(input: string): string | null {
    const trimmed = input.trim();
    const fromUrl = trimmed.match(/playlist[/:]([a-zA-Z0-9]+)/);
    if (fromUrl?.[1]) return fromUrl[1];
    return /^[a-zA-Z0-9]{16,32}$/.test(trimmed) ? trimmed : null;
  }

  async playlistTracks(playlistId: string, max = 100): Promise<SpotifyTrack[]> {
    const tracks: SpotifyTrack[] = [];
    let offset = 0;
    while (tracks.length < max) {
      const body = await this.get<{
        items: Array<{ track: SpotifyApiTrack | null }>;
        next: string | null;
      }>(`/playlists/${playlistId}/tracks?limit=50&offset=${offset}`);

      for (const item of body.items) {
        if (item.track?.id) tracks.push(this.toTrack(item.track));
        if (tracks.length >= max) break;
      }
      if (!body.next) break;
      offset += 50;
    }
    return tracks;
  }
}
