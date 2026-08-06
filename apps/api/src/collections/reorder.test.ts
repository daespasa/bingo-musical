import { describe, expect, it } from 'vitest';
import { ReorderError, planReorder } from './reorder';

describe('planReorder', () => {
  it('aparca en negativo antes de escribir las posiciones definitivas', () => {
    const plan = planReorder(['a', 'b', 'c'], ['c', 'a', 'b']);

    // Ninguna posición temporal puede coincidir con una definitiva
    const finals = new Set(plan.final.map((p) => p.position));
    for (const parked of plan.parking) {
      expect(parked.position).toBeLessThan(0);
      expect(finals.has(parked.position)).toBe(false);
    }
  });

  it('deja las canciones en el orden pedido, empezando en cero', () => {
    const plan = planReorder(['a', 'b', 'c'], ['c', 'a', 'b']);
    expect(plan.final).toEqual([
      { trackId: 'c', position: 0 },
      { trackId: 'a', position: 1 },
      { trackId: 'b', position: 2 },
    ]);
  });

  it('no repite posiciones temporales', () => {
    const plan = planReorder(['a', 'b', 'c', 'd'], ['d', 'c', 'b', 'a']);
    const parked = plan.parking.map((p) => p.position);
    expect(new Set(parked).size).toBe(parked.length);
  });

  it('acepta un orden que no cambia nada', () => {
    const plan = planReorder(['a', 'b'], ['a', 'b']);
    expect(plan.final).toEqual([
      { trackId: 'a', position: 0 },
      { trackId: 'b', position: 1 },
    ]);
  });

  it('rechaza que falten canciones', () => {
    expect(() => planReorder(['a', 'b', 'c'], ['a', 'b'])).toThrow(ReorderError);
  });

  it('rechaza canciones ajenas a la colección', () => {
    expect(() => planReorder(['a', 'b'], ['a', 'z'])).toThrow(ReorderError);
  });

  it('rechaza repeticiones, que dejarían una canción sin posición', () => {
    expect(() => planReorder(['a', 'b'], ['a', 'a'])).toThrow(ReorderError);
  });

  it('aguanta una colección vacía', () => {
    const plan = planReorder([], []);
    expect(plan.parking).toEqual([]);
    expect(plan.final).toEqual([]);
  });
});
