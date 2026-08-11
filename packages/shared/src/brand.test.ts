import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { APP_BRAND, brandTitle } from './brand';
import { describeGameMode } from './game-modes';

describe('APP_BRAND', () => {
  it('expone el nombre comercial del producto', () => {
    expect(APP_BRAND.name).toBe('Gramola');
    expect(APP_BRAND.shortName).toBe('Gramola');
  });

  it('trae los reclamos de cabecera y portada', () => {
    expect(APP_BRAND.tagline).toBe('Juega, escucha y adivina');
    expect(APP_BRAND.heroTagline).toBe('Tu música. Vuestro juego.');
  });

  it('describe la plataforma sin atarla al bingo', () => {
    // El bingo se nombra como uno de los modos, nunca como el producto.
    expect(APP_BRAND.longDescription).toContain('juegos musicales');
    expect(APP_BRAND.longDescription).not.toMatch(/^Bingo/);
  });

  it('compone títulos de página con la marca detrás', () => {
    expect(brandTitle('Sin conexión')).toBe('Sin conexión · Gramola');
  });
});

/**
 * El nombre viejo no debe reaparecer en texto que ve quien juega.
 *
 * El guardián distingue por mayúsculas, que es lo que separa los dos usos:
 * «Bingo Musical» era el nombre del producto y ya no existe; «Bingo musical»
 * es el nombre de uno de los modos de juego y sí debe seguir apareciendo.
 *
 * Los identificadores técnicos heredados (`@bingo/*`, `bingo_session`, el
 * nombre del proyecto Docker, `demo@bingo.local`) se conservan a propósito y
 * están justificados en DECISIONS.md, así que quedan fuera de esta comprobación.
 */
describe('marca visible', () => {
  const repoRoot = resolve(__dirname, '../../..');
  const scanned = ['apps/web/src', 'apps/api/src', 'packages/shared/src'];

  function sourceFiles(dir: string): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        out.push(...sourceFiles(full));
      } else if (/\.(ts|tsx)$/.test(entry) && !entry.endsWith('.test.ts')) {
        out.push(full);
      }
    }
    return out;
  }

  it('no queda «Bingo Musical» en el código de las apps', () => {
    const offenders = scanned
      .flatMap((dir) => sourceFiles(join(repoRoot, dir)))
      .filter((file) => /Bingo Musical/.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(repoRoot.length + 1));

    expect(offenders).toEqual([]);
  });

  it('el modo de juego sí conserva su nombre', () => {
    // Renombrar el producto no renombra el bingo: sigue siendo uno de los modos.
    expect(describeGameMode('MUSIC_BINGO').name).toBe('Bingo musical');
  });
});
