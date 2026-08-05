/**
 * `spotify-preview-finder` no publica tipos. Declaramos aquí la firma real
 * (verificada contra el index.js del paquete 2.1.0) para poder consumirlo
 * con TypeScript estricto desde el provider que lo encapsula.
 */
declare module 'spotify-preview-finder' {
  type SpotifyPreviewResult = {
    name: string;
    spotifyUrl: string;
    previewUrls: string[];
    trackId: string;
    albumName: string;
    releaseDate: string;
    popularity: number;
    durationMs: number;
  };

  function searchAndGetLinks(
    songName: string,
    artist?: string | number,
    limit?: number,
  ): Promise<{
    success: boolean;
    error?: string;
    searchQuery?: string;
    results: SpotifyPreviewResult[];
  }>;

  export = searchAndGetLinks;
}
