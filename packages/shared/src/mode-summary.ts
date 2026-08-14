import { readGameModeConfig, type MixedConfig } from './game-config';
import type { GameMode } from './game-modes';

const MIXED_SUMMARIES: Record<MixedConfig['preset'], string> = {
  EQUILIBRADO: 'mezcla equilibrada',
  SOLO_RECONOCIMIENTO: 'solo reconocimiento',
  PERSONALIZADO: 'mezcla personalizada',
};

/**
 * El dato que resume una partida en una línea, según su modo.
 *
 * Existe porque la sala de espera y el resumen de partida enseñaban «cartón
 * N×N» en los cinco modos, incluso en un quiz donde no hay ningún cartón. Se
 * redacta en un solo sitio para que la API y la web no digan cosas distintas.
 *
 * Nunca lanza: una configuración nula (partidas anteriores a la épica) o
 * corrupta cae en la de por defecto del modo. Esto es una etiqueta de
 * pantalla, no una regla de juego; negarse a pintarla no protege de nada y
 * deja al anfitrión sin poder abrir su historial.
 */
export function describeModeSummary(mode: GameMode, storedConfig: unknown, cardSize = 3): string {
  let config;
  try {
    config = readGameModeConfig(mode, storedConfig);
  } catch {
    config = readGameModeConfig(mode, null);
  }

  switch (config.mode) {
    case 'MUSIC_BINGO':
      return `cartón ${cardSize}×${cardSize}`;
    case 'MULTIPLE_CHOICE':
      return `${config.optionCount} opciones por pregunta`;
    case 'FREE_TEXT':
      if (config.attempts === null) return 'intentos ilimitados';
      return config.attempts === 1 ? '1 intento' : `${config.attempts} intentos`;
    case 'SURVIVAL':
      return config.lives === 1 ? '1 vida' : `${config.lives} vidas`;
    case 'MIXED':
      return MIXED_SUMMARIES[config.preset];
  }
}
