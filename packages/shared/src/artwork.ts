/**
 * Proporción mínima de pistas con carátula para que el cartón con portadas
 * merezca la pena. Por debajo, el cartón queda medio vacío —unas casillas con
 * imagen y otras sin ella—, que se ve peor que uno de solo texto.
 */
export const ARTWORK_COVERAGE_THRESHOLD = 0.8;

/**
 * Si una colección tiene carátulas suficientes para ofrecer el cartón con
 * portadas. Una colección vacía nunca cumple: activarlas sobre nada daría un
 * cartón de huecos, y además evita dividir por cero.
 */
export function hasEnoughArtwork(withCover: number, total: number): boolean {
  if (total <= 0) return false;
  return withCover / total >= ARTWORK_COVERAGE_THRESHOLD;
}
