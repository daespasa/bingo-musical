export type PreviewResolution =
  | {
      status: 'AVAILABLE';
      provider: 'SPOTIFY_PREVIEW_FINDER';
      url: string;
      durationMs: number;
      confidence: number;
      resolvedAt: Date;
    }
  | {
      status: 'NOT_FOUND' | 'RATE_LIMITED' | 'INVALID_RESPONSE' | 'UNREACHABLE' | 'ERROR';
      reason?: string;
    };

export interface PreviewProvider {
  resolve(input: {
    spotifyTrackId?: string;
    title: string;
    artist: string;
    durationMs?: number;
  }): Promise<PreviewResolution>;
}
