import { describe, expect, it } from 'vitest';
import { CANDIDATES_PER_THEME, MIN_PLAYABLE, THEMES, shouldPublish } from './themes';

describe('definición de temas', () => {
  it('no repite claves, que son la identidad de cada colección', () => {
    const keys = THEMES.map((t) => t.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('cada tema tiene nombre, descripción y al menos una consulta', () => {
    for (const theme of THEMES) {
      expect(theme.name.length).toBeGreaterThan(2);
      expect(theme.description.length).toBeGreaterThan(10);
      expect(theme.queries.length).toBeGreaterThan(0);
    }
  });

  it('las claves valen para una URL', () => {
    for (const theme of THEMES) {
      expect(theme.key).toMatch(/^[a-z0-9-]+$/);
    }
  });

  it('pide más candidatas de las que hacen falta, porque muchas no sonarán', () => {
    expect(CANDIDATES_PER_THEME).toBeGreaterThan(MIN_PLAYABLE);
  });
});

describe('shouldPublish', () => {
  it('publica cuando hay suficientes canciones que suenan', () => {
    expect(shouldPublish(MIN_PLAYABLE)).toBe(true);
    expect(shouldPublish(MIN_PLAYABLE + 20)).toBe(true);
  });

  it('conserva la versión anterior si la nueva se queda corta', () => {
    expect(shouldPublish(MIN_PLAYABLE - 1)).toBe(false);
    expect(shouldPublish(0)).toBe(false);
  });

  it('cubre de sobra un cartón de 5×5', () => {
    expect(MIN_PLAYABLE).toBeGreaterThanOrEqual(25);
  });
});
