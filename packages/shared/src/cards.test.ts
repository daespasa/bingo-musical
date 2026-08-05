import { describe, expect, it } from 'vitest';
import {
  completedRows,
  createRng,
  effectiveValidPositions,
  generateCard,
  isFullCard,
  seededShuffle,
} from './cards';

const pool = Array.from({ length: 30 }, (_, i) => ({
  id: `t${i}`,
  title: `Canción ${i}`,
  artist: `Artista ${i % 5}`,
}));

describe('generateCard', () => {
  it('genera cartones deterministas con la misma semilla', () => {
    const a = generateCard({ tracks: pool, size: 5, freeCenter: false, seed: 'room1:p1' });
    const b = generateCard({ tracks: pool, size: 5, freeCenter: false, seed: 'room1:p1' });
    expect(a).toEqual(b);
  });

  it('genera cartones distintos con semillas distintas', () => {
    const a = generateCard({ tracks: pool, size: 5, freeCenter: false, seed: 'room1:p1' });
    const b = generateCard({ tracks: pool, size: 5, freeCenter: false, seed: 'room1:p2' });
    expect(a.map((c) => c.trackId)).not.toEqual(b.map((c) => c.trackId));
  });

  it('no repite canciones dentro de un cartón', () => {
    const cells = generateCard({ tracks: pool, size: 5, freeCenter: false, seed: 'x' });
    const ids = cells.map((c) => c.trackId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('coloca el centro libre en tamaños impares', () => {
    const cells = generateCard({ tracks: pool, size: 3, freeCenter: true, seed: 'x' });
    expect(cells[4]!.isFree).toBe(true);
    expect(cells[4]!.trackId).toBeNull();
    expect(cells.filter((c) => c.isFree)).toHaveLength(1);
  });

  it('ignora el centro libre en tamaños pares', () => {
    const cells = generateCard({ tracks: pool, size: 4, freeCenter: true, seed: 'x' });
    expect(cells.every((c) => !c.isFree)).toBe(true);
  });

  it('lanza error si no hay canciones suficientes', () => {
    expect(() =>
      generateCard({ tracks: pool.slice(0, 8), size: 3, freeCenter: false, seed: 'x' }),
    ).toThrow();
  });

  it('rellena todas las posiciones en orden', () => {
    const cells = generateCard({ tracks: pool, size: 4, freeCenter: false, seed: 'y' });
    expect(cells.map((c) => c.position)).toEqual(Array.from({ length: 16 }, (_, i) => i));
  });
});

describe('completedRows', () => {
  it('detecta una línea horizontal completa', () => {
    expect(completedRows(3, new Set([0, 1, 2]))).toEqual([0]);
    expect(completedRows(3, new Set([3, 4, 5]))).toEqual([1]);
  });

  it('no detecta líneas incompletas', () => {
    expect(completedRows(3, new Set([0, 1]))).toEqual([]);
    expect(completedRows(3, new Set([0, 4, 8]))).toEqual([]);
  });

  it('detecta varias líneas', () => {
    expect(completedRows(3, new Set([0, 1, 2, 6, 7, 8]))).toEqual([0, 2]);
  });

  it('cuenta las casillas libres mediante effectiveValidPositions', () => {
    const valid = effectiveValidPositions([3, 5], [4]);
    expect(completedRows(3, valid)).toEqual([1]);
  });
});

describe('isFullCard', () => {
  it('detecta bingo con el cartón completo', () => {
    const all = new Set(Array.from({ length: 9 }, (_, i) => i));
    expect(isFullCard(3, all)).toBe(true);
  });

  it('no detecta bingo si falta una casilla', () => {
    const set = new Set(Array.from({ length: 8 }, (_, i) => i));
    expect(isFullCard(3, set)).toBe(false);
  });
});

describe('createRng / seededShuffle', () => {
  it('la misma semilla produce la misma secuencia', () => {
    const a = createRng('seed');
    const b = createRng('seed');
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });

  it('baraja de forma determinista', () => {
    const items = [1, 2, 3, 4, 5];
    expect(seededShuffle(items, createRng('s'))).toEqual(seededShuffle(items, createRng('s')));
  });
});
