import { normalizeText } from '@bingo/shared';

/** Similitud de Dice sobre bigramas: 0 (nada) a 1 (idéntico). */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const gram = s.slice(i, i + 2);
      map.set(gram, (map.get(gram) ?? 0) + 1);
    }
    return map;
  };
  const first = bigrams(a);
  const second = bigrams(b);
  let intersection = 0;
  let totalFirst = 0;
  let totalSecond = 0;
  for (const count of first.values()) totalFirst += count;
  for (const [gram, count] of second) {
    totalSecond += count;
    const inFirst = first.get(gram);
    if (inFirst) intersection += Math.min(inFirst, count);
  }
  return (2 * intersection) / (totalFirst + totalSecond);
}

export type MatchCandidate = {
  /** Nombre devuelto por el proveedor: "Título - Artista1, Artista2". */
  name: string;
  trackId?: string;
  durationMs?: number;
  previewUrls: string[];
};

export type MatchInput = {
  title: string;
  artist: string;
  spotifyTrackId?: string;
  durationMs?: number;
};

/**
 * Confianza de que un candidato corresponde a la pista buscada.
 *
 * - Coincidencia exacta de Track ID: confianza máxima.
 * - Si no, media ponderada de la similitud de título (0,6) y artista (0,4),
 *   penalizada cuando la duración difiere más de 3 s.
 */
export function scoreCandidate(input: MatchInput, candidate: MatchCandidate): number {
  if (input.spotifyTrackId && candidate.trackId === input.spotifyTrackId) {
    return 1;
  }
  const [rawTitle, rawArtist = ''] = candidate.name.split(' - ');
  const titleScore = diceCoefficient(normalizeText(input.title), normalizeText(rawTitle ?? ''));
  const artistScore = diceCoefficient(normalizeText(input.artist), normalizeText(rawArtist));
  let score = titleScore * 0.6 + artistScore * 0.4;

  if (input.durationMs && candidate.durationMs) {
    const deltaMs = Math.abs(input.durationMs - candidate.durationMs);
    if (deltaMs > 3000) {
      // Hasta un 25 % de penalización según lo lejos que quede la duración
      score *= Math.max(0.75, 1 - Math.min(deltaMs - 3000, 30000) / 120000);
    }
  }
  return Math.min(1, Math.max(0, score));
}

/** Solo aceptamos previews servidas por el CDN de Spotify sobre HTTPS. */
export function isValidPreviewUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('scdn.co');
  } catch {
    return false;
  }
}

/** Elige el mejor candidato con preview válida, o null si ninguno sirve. */
export function pickBestCandidate(
  input: MatchInput,
  candidates: readonly MatchCandidate[],
): { candidate: MatchCandidate; url: string; confidence: number } | null {
  let best: { candidate: MatchCandidate; url: string; confidence: number } | null = null;
  for (const candidate of candidates) {
    const url = candidate.previewUrls.find(isValidPreviewUrl);
    if (!url) continue;
    const confidence = scoreCandidate(input, candidate);
    if (!best || confidence > best.confidence) {
      best = { candidate, url, confidence };
    }
  }
  return best;
}
