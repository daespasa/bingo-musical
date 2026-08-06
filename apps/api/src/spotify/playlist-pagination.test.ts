import { describe, expect, it, vi } from 'vitest';
import {
  PLAYLIST_IMPORT_MAX,
  collectPlaylistTracks,
  type PlaylistPage,
} from './playlist-pagination';
import type { SpotifyTrack } from './spotify-api.service';

function track(n: number): SpotifyTrack {
  return {
    spotifyTrackId: `id-${n}`,
    title: `Canción ${n}`,
    artists: ['Artista'],
    album: 'Álbum',
    coverUrl: null,
    durationMs: 200_000,
    externalUrl: 'https://open.spotify.com/track/x',
  };
}

/** Lista falsa de `total` canciones servida en páginas de 50. */
function fakePlaylist(total: number) {
  return vi.fn(async (offset: number): Promise<PlaylistPage> => {
    const page = Array.from({ length: Math.min(50, Math.max(0, total - offset)) }, (_, i) =>
      track(offset + i),
    );
    return { tracks: page, pageSize: page.length, total, hasNext: offset + page.length < total };
  });
}

describe('collectPlaylistTracks', () => {
  it('recoge una lista corta de una sola página', async () => {
    const result = await collectPlaylistTracks(fakePlaylist(12));
    expect(result.tracks).toHaveLength(12);
    expect(result.total).toBe(12);
    expect(result.skipped).toBe(0);
  });

  it('pagina más allá de las cien, que era el límite anterior', async () => {
    const fetchPage = fakePlaylist(340);
    const result = await collectPlaylistTracks(fetchPage);
    expect(result.tracks).toHaveLength(340);
    expect(result.skipped).toBe(0);
    expect(fetchPage).toHaveBeenCalledTimes(7);
  });

  it('corta en el tope y dice cuántas deja fuera', async () => {
    const result = await collectPlaylistTracks(fakePlaylist(1200), 500);
    expect(result.tracks).toHaveLength(500);
    expect(result.total).toBe(1200);
    expect(result.skipped).toBe(700);
  });

  it('no pide más páginas de las necesarias al llegar al tope', async () => {
    const fetchPage = fakePlaylist(1000);
    await collectPlaylistTracks(fetchPage, 100);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('aguanta una lista vacía', async () => {
    const result = await collectPlaylistTracks(fakePlaylist(0));
    expect(result.tracks).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('no inventa canciones perdidas si la lista encogió a mitad de recorrido', async () => {
    // Spotify dice que hay 10 pero solo entrega 4
    const fetchPage = vi.fn(async (): Promise<PlaylistPage> => {
      return {
        tracks: [track(1), track(2), track(3), track(4)],
        pageSize: 4,
        total: 4,
        hasNext: false,
      };
    });
    const result = await collectPlaylistTracks(fetchPage);
    expect(result.tracks).toHaveLength(4);
    expect(result.skipped).toBe(0);
  });

  it('avanza por los elementos de la página, no por las canciones válidas', async () => {
    // Páginas de 50 elementos donde solo 10 son canciones: el resto, episodios
    const seen: number[] = [];
    const fetchPage = vi.fn(async (offset: number): Promise<PlaylistPage> => {
      seen.push(offset);
      return {
        tracks: Array.from({ length: 10 }, (_, i) => track(offset + i)),
        pageSize: 50,
        total: 150,
        hasNext: offset + 50 < 150,
      };
    });
    const result = await collectPlaylistTracks(fetchPage);
    // Si avanzara por canciones válidas iría 0, 10, 20… y repetiría
    expect(seen).toEqual([0, 50, 100]);
    expect(result.tracks).toHaveLength(30);
  });

  it('el tope por defecto es quinientas', () => {
    expect(PLAYLIST_IMPORT_MAX).toBe(500);
  });
});
