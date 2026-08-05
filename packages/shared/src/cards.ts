/**
 * Generación determinista de cartones y detección de línea/bingo.
 * Versión del algoritmo: 1 (persistida en BingoCard.algorithmVersion).
 */

export const CARD_ALGORITHM_VERSION = 1;

export type CardTrack = { id: string; title: string; artist: string };

export type GeneratedCell = {
  position: number;
  trackId: string | null;
  displayTitle: string;
  displayArtist: string;
  isFree: boolean;
};

/** Hash FNV-1a de 32 bits para derivar una semilla numérica de un string. */
export function hashSeed(seed: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG determinista mulberry32. */
export function createRng(seed: string): () => number {
  let a = hashSeed(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: readonly T[], rng: () => number): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

export type GenerateCardInput = {
  tracks: readonly CardTrack[];
  size: 3 | 4 | 5;
  freeCenter: boolean;
  seed: string;
};

/**
 * Genera un cartón size×size eligiendo canciones distintas del pool.
 * El centro libre solo aplica en tamaños impares.
 */
export function generateCard(input: GenerateCardInput): GeneratedCell[] {
  const { tracks, size, freeCenter, seed } = input;
  const totalCells = size * size;
  const hasFreeCenter = freeCenter && size % 2 === 1;
  const needed = hasFreeCenter ? totalCells - 1 : totalCells;
  if (tracks.length < needed) {
    throw new Error(`Se necesitan al menos ${needed} canciones y hay ${tracks.length}`);
  }
  const rng = createRng(seed);
  const chosen = seededShuffle(tracks, rng).slice(0, needed);
  const centerPosition = Math.floor(totalCells / 2);

  const cells: GeneratedCell[] = [];
  let cursor = 0;
  for (let position = 0; position < totalCells; position++) {
    if (hasFreeCenter && position === centerPosition) {
      cells.push({
        position,
        trackId: null,
        displayTitle: '★ LIBRE',
        displayArtist: '',
        isFree: true,
      });
      continue;
    }
    const track = chosen[cursor++]!;
    cells.push({
      position,
      trackId: track.id,
      displayTitle: track.title,
      displayArtist: track.artist,
      isFree: false,
    });
  }
  return cells;
}

/**
 * Devuelve los índices de filas completas (líneas horizontales) dado el
 * conjunto de posiciones válidas (marcadas y confirmadas) y las libres.
 */
export function completedRows(size: number, validPositions: ReadonlySet<number>): number[] {
  const rows: number[] = [];
  for (let row = 0; row < size; row++) {
    let complete = true;
    for (let col = 0; col < size; col++) {
      if (!validPositions.has(row * size + col)) {
        complete = false;
        break;
      }
    }
    if (complete) rows.push(row);
  }
  return rows;
}

/** Bingo completo: todas las posiciones del cartón válidas (o libres). */
export function isFullCard(size: number, validPositions: ReadonlySet<number>): boolean {
  return validPositions.size >= size * size;
}

/**
 * Une posiciones válidas con las casillas libres (que siempre cuentan).
 */
export function effectiveValidPositions(
  validPositions: Iterable<number>,
  freePositions: Iterable<number>,
): Set<number> {
  const set = new Set<number>(validPositions);
  for (const p of freePositions) set.add(p);
  return set;
}
