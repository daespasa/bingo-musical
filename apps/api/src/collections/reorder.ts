/**
 * Reordenar canciones dentro de una colección.
 *
 * `MusicCollectionTrack` tiene `unique(collectionId, position)`, así que no se
 * pueden escribir las posiciones definitivas de una tacada: en cuanto dos
 * canciones se cruzan, la escritura choca contra la restricción. Por eso el
 * plan tiene dos pasadas, primero a posiciones temporales negativas.
 */
export type PositionChange = { trackId: string; position: number };

export type ReorderPlan = {
  /** Posiciones temporales, fuera del rango de las definitivas. */
  parking: PositionChange[];
  /** Posiciones finales, ya en el orden pedido. */
  final: PositionChange[];
};

export class ReorderError extends Error {}

/**
 * @param current  Identificadores de las canciones que hay ahora, en su orden.
 * @param desired  Los mismos identificadores en el orden que se quiere.
 */
export function planReorder(current: string[], desired: string[]): ReorderPlan {
  if (desired.length !== current.length) {
    throw new ReorderError('El nuevo orden tiene que incluir todas las canciones, y solo esas');
  }
  const currentSet = new Set(current);
  const seen = new Set<string>();
  for (const trackId of desired) {
    if (!currentSet.has(trackId)) {
      throw new ReorderError('El nuevo orden incluye una canción que no está en la colección');
    }
    if (seen.has(trackId)) {
      throw new ReorderError('El nuevo orden repite una canción');
    }
    seen.add(trackId);
  }

  return {
    // Negativas y distintas entre sí: no chocan ni con las viejas ni entre ellas
    parking: desired.map((trackId, index) => ({ trackId, position: -(index + 1) })),
    final: desired.map((trackId, index) => ({ trackId, position: index })),
  };
}
