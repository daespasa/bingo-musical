import { describe, expect, it } from 'vitest';
import {
  GAME_CONFIG_VERSION,
  defaultConfigForMode,
  describeGameVariant,
  parseConfigForMode,
  parseGameModeConfig,
  readGameModeConfig,
} from './game-config';
import {
  GAME_MODE_CATALOG,
  describeGameMode,
  isPlayableGameMode,
  playableGameModes,
} from './game-modes';

describe('catálogo de modos', () => {
  it('describe cada modo con nombre propio, no con su identificador', () => {
    for (const mode of GAME_MODE_CATALOG) {
      expect(mode.name).not.toMatch(/_/);
      expect(mode.description.length).toBeGreaterThan(10);
      expect(mode.recommendedPlayers.min).toBeLessThan(mode.recommendedPlayers.max);
    }
  });

  it('solo anuncia como disponible lo que se puede jugar de principio a fin', () => {
    // Si esto falla es que se ha marcado un modo disponible sin implementarlo,
    // que es exactamente lo que no debe llegar al selector.
    expect(playableGameModes().map((mode) => mode.id)).toEqual([
      'MUSIC_BINGO',
      'MULTIPLE_CHOICE',
      'FREE_TEXT',
      'SURVIVAL',
      'MIXED',
    ]);
    // Ya no queda ningún modo del catálogo por implementar; lo que no existe
    // sigue sin ser jugable.
    expect(isPlayableGameMode('NO_EXISTE')).toBe(false);
    expect(isPlayableGameMode('SONG_DUEL')).toBe(false);
  });

  it('falla al describir un modo desconocido', () => {
    expect(() => describeGameMode('INVENTADO' as never)).toThrow(/desconocido/i);
  });
});

describe('configuración por modo', () => {
  it('el bingo por defecto es a ciegas, como se jugaba antes', () => {
    const config = defaultConfigForMode('MUSIC_BINGO');
    expect(config.revealMode).toBe('HIDDEN_UNTIL_REVEAL');
    expect(config.configVersion).toBe(GAME_CONFIG_VERSION);
  });

  it('da valores por defecto para todos los modos del catálogo', () => {
    for (const mode of GAME_MODE_CATALOG) {
      expect(defaultConfigForMode(mode.id).mode).toBe(mode.id);
    }
  });

  it('acepta el bingo revelado', () => {
    const config = parseConfigForMode('MUSIC_BINGO', {
      mode: 'MUSIC_BINGO',
      revealMode: 'VISIBLE_FROM_START',
    });
    expect(config.revealMode).toBe('VISIBLE_FROM_START');
  });

  it('rechaza una variante de bingo que no existe', () => {
    expect(() =>
      parseConfigForMode('MUSIC_BINGO', { mode: 'MUSIC_BINGO', revealMode: 'A_MEDIAS' }),
    ).toThrow();
  });

  it('rechaza una configuración cuyo modo no es el de la partida', () => {
    // Defensa contra una fila JSON manipulada: las reglas no pueden cambiar
    // por debajo del modo con el que se creó la partida.
    expect(() => parseConfigForMode('MUSIC_BINGO', { mode: 'SURVIVAL', lives: 3 })).toThrow();
  });

  it('discrimina por modo al validar una configuración cualquiera', () => {
    const survival = parseGameModeConfig({ mode: 'SURVIVAL', lives: 5 });
    expect(survival.mode).toBe('SURVIVAL');
    if (survival.mode === 'SURVIVAL') expect(survival.lives).toBe(5);
  });

  it('rechaza un modo inexistente', () => {
    expect(() => parseGameModeConfig({ mode: 'KARAOKE' })).toThrow();
  });

  it('acota las vidas de supervivencia a un rango jugable', () => {
    expect(() => parseGameModeConfig({ mode: 'SURVIVAL', lives: 0 })).toThrow();
    expect(() => parseGameModeConfig({ mode: 'SURVIVAL', lives: 99 })).toThrow();
  });

  it('acota el número de opciones del quiz entre 2 y 4', () => {
    expect(() => parseGameModeConfig({ mode: 'MULTIPLE_CHOICE', optionCount: 1 })).toThrow();
    expect(() => parseGameModeConfig({ mode: 'MULTIPLE_CHOICE', optionCount: 5 })).toThrow();
    expect(parseGameModeConfig({ mode: 'MULTIPLE_CHOICE', optionCount: 3 }).mode).toBe(
      'MULTIPLE_CHOICE',
    );
  });

  it('permite intentos ilimitados en respuesta libre con null', () => {
    const config = parseConfigForMode('FREE_TEXT', { mode: 'FREE_TEXT', attempts: null });
    expect(config.attempts).toBeNull();
  });

  it('por defecto la respuesta libre da un solo intento', () => {
    expect(defaultConfigForMode('FREE_TEXT').attempts).toBe(1);
  });
});

describe('partidas anteriores a Gramola', () => {
  it('lee una partida sin configuración como bingo por defecto', () => {
    // Es el caso del historial existente: `modeConfig` es null en todas.
    expect(readGameModeConfig('MUSIC_BINGO', null).revealMode).toBe('HIDDEN_UNTIL_REVEAL');
    expect(readGameModeConfig('MUSIC_BINGO', undefined).mode).toBe('MUSIC_BINGO');
  });

  it('respeta la configuración guardada cuando existe', () => {
    const stored = { mode: 'MUSIC_BINGO', configVersion: 1, revealMode: 'VISIBLE_FROM_START' };
    expect(readGameModeConfig('MUSIC_BINGO', stored).revealMode).toBe('VISIBLE_FROM_START');
  });

  it('falla si la configuración guardada está corrupta, en vez de inventarse reglas', () => {
    expect(() =>
      readGameModeConfig('MUSIC_BINGO', { mode: 'MUSIC_BINGO', revealMode: 42 }),
    ).toThrow();
  });
});

describe('nombre de la variante', () => {
  it('distingue las dos variantes de bingo', () => {
    expect(describeGameVariant(defaultConfigForMode('MUSIC_BINGO'))).toBe('Bingo a ciegas');
    expect(
      describeGameVariant(
        parseConfigForMode('MUSIC_BINGO', {
          mode: 'MUSIC_BINGO',
          revealMode: 'VISIBLE_FROM_START',
        }),
      ),
    ).toBe('Bingo clásico');
  });

  it('nombra la variante de los demás modos', () => {
    expect(describeGameVariant(defaultConfigForMode('SURVIVAL'))).toBe('Con opciones');
    expect(describeGameVariant(defaultConfigForMode('MULTIPLE_CHOICE'))).toBe('Título');
    expect(describeGameVariant(defaultConfigForMode('MIXED'))).toBe('Equilibrado');
  });
});
