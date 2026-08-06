import type { SpotifyTrack } from './spotify-api.service';

/**
 * Tope de canciones por importación. Una partida usa veinte o treinta, así que
 * quinientas cubren cualquier lista real sin llenar la base de datos ni tener
 * al resolutor de audio trabajando durante horas.
 */
export const PLAYLIST_IMPORT_MAX = 500;

export type PlaylistPage = {
  /** Canciones utilizables de esta página, ya sin episodios ni retiradas. */
  tracks: SpotifyTrack[];
  /**
   * Elementos que traía la página antes de descartar los inservibles. El
   * desplazamiento tiene que avanzar por esto y no por `tracks`, o una página
   * con episodios haría que se repitieran canciones.
   */
  pageSize: number;
  /** Total de canciones de la lista según Spotify, no de esta página. */
  total: number;
  hasNext: boolean;
};

export type CollectedPlaylist = {
  tracks: SpotifyTrack[];
  /** Lo que tiene la lista en Spotify. */
  total: number;
  /** Cuántas se quedan fuera por el tope, para poder decirlo. */
  skipped: number;
};

/**
 * Recorre las páginas de una lista hasta el tope. Se separa del cliente HTTP
 * para poder probar el recorrido sin salir a Internet.
 */
export async function collectPlaylistTracks(
  fetchPage: (offset: number) => Promise<PlaylistPage>,
  max: number = PLAYLIST_IMPORT_MAX,
): Promise<CollectedPlaylist> {
  const tracks: SpotifyTrack[] = [];
  let offset = 0;
  let total = 0;

  while (tracks.length < max) {
    const page = await fetchPage(offset);
    total = page.total;

    for (const track of page.tracks) {
      tracks.push(track);
      if (tracks.length >= max) break;
    }

    if (!page.hasNext) break;
    if (page.pageSize === 0) break; // sin avance posible: se acabó
    offset += page.pageSize;
  }

  // `total` puede venir por debajo de lo recogido si la lista cambió a mitad
  const known = Math.max(total, tracks.length);
  return { tracks, total: known, skipped: Math.max(0, known - tracks.length) };
}
