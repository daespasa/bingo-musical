import { describe, expect, it } from 'vitest';
import { describeModeSummary } from './mode-summary';

describe('describeModeSummary', () => {
  it('en bingo dice el tamaño del cartón', () => {
    expect(describeModeSummary('MUSIC_BINGO', { mode: 'MUSIC_BINGO' }, 4)).toBe('cartón 4×4');
  });

  it('en bingo sin tamaño cae en el 3×3, que es el de Prisma', () => {
    expect(describeModeSummary('MUSIC_BINGO', { mode: 'MUSIC_BINGO' })).toBe('cartón 3×3');
  });

  it('en quiz dice cuántas opciones tiene cada pregunta', () => {
    expect(
      describeModeSummary('MULTIPLE_CHOICE', { mode: 'MULTIPLE_CHOICE', optionCount: 3 }),
    ).toBe('3 opciones por pregunta');
  });

  it('en adivinanza dice los intentos, y los ilimitados se dicen con palabras', () => {
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: 2 })).toBe('2 intentos');
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: 1 })).toBe('1 intento');
    expect(describeModeSummary('FREE_TEXT', { mode: 'FREE_TEXT', attempts: null })).toBe(
      'intentos ilimitados',
    );
  });

  it('en supervivencia dice las vidas, en singular cuando es una', () => {
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 5 })).toBe('5 vidas');
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 1 })).toBe('1 vida');
  });

  it('en mixto dice qué mezcla es', () => {
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'EQUILIBRADO' })).toBe(
      'mezcla equilibrada',
    );
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'SOLO_RECONOCIMIENTO' })).toBe(
      'solo reconocimiento',
    );
    expect(describeModeSummary('MIXED', { mode: 'MIXED', preset: 'PERSONALIZADO' })).toBe(
      'mezcla personalizada',
    );
  });

  /*
   * Las partidas anteriores a la épica tienen `modeConfig` nulo. Abrir su
   * historial no puede reventar: se lee como la configuración por defecto,
   * igual que ya hace `readGameModeConfig`.
   */
  it('con configuración nula usa la de por defecto del modo, sin lanzar', () => {
    expect(describeModeSummary('SURVIVAL', null)).toBe('3 vidas');
    expect(describeModeSummary('MULTIPLE_CHOICE', undefined)).toBe('4 opciones por pregunta');
    expect(describeModeSummary('MUSIC_BINGO', null, 5)).toBe('cartón 5×5');
  });

  it('con configuración corrupta no revienta la pantalla: cae en la de por defecto', () => {
    expect(describeModeSummary('SURVIVAL', { mode: 'SURVIVAL', lives: 'muchas' })).toBe('3 vidas');
  });
});
