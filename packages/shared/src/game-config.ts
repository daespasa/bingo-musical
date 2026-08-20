import { z } from 'zod';
import {
  BINGO_REVEAL_MODES,
  BINGO_VARIANTS,
  FREE_TEXT_QUESTION_TYPES,
  MULTIPLE_CHOICE_QUESTION_TYPES,
  type GameMode,
} from './game-modes';

/**
 * Configuración específica de cada modo.
 *
 * Vive en una columna JSON (`Game.modeConfig`) en lugar de en decenas de
 * columnas nullable, porque cada modo necesita campos que a los demás no les
 * dicen nada y añadir un modo no debería exigir una migración de esquema. El
 * precio de un JSON es que la base de datos no lo valida, así que lo validamos
 * nosotros **al escribir y al leer** con estos esquemas discriminados. Nunca
 * `any`: fuera de este archivo la configuración siempre está tipada.
 *
 * Lo que comparten todos los modos (rondas, duraciones, revelado, avance,
 * ranking) sigue en columnas de `GameSettings`: es consultable, migrable y no
 * cambia al añadir modos.
 */

/**
 * Versión del formato de configuración.
 *
 * Se guarda con los datos para poder migrar configuraciones antiguas sin
 * adivinar su forma. Solo sube cuando un cambio sea incompatible.
 */
export const GAME_CONFIG_VERSION = 1;

const configVersion = z.number().int().positive().default(GAME_CONFIG_VERSION);

export const musicBingoConfigSchema = z.object({
  mode: z.literal('MUSIC_BINGO'),
  configVersion,
  /** A ciegas (bingo de siempre) o revelado desde el primer segundo. */
  revealMode: z.enum(BINGO_REVEAL_MODES).default('HIDDEN_UNTIL_REVEAL'),
  /** Las casillas muestran la carátula del álbum, nítida al revelar. */
  showArtwork: z.boolean().default(false),
});

export const multipleChoiceConfigSchema = z.object({
  mode: z.literal('MULTIPLE_CHOICE'),
  configVersion,
  questionTypes: z.array(z.enum(MULTIPLE_CHOICE_QUESTION_TYPES)).min(1).default(['SONG_TITLE']),
  /** Entre 2 y 4 opciones: con más, la pantalla del móvil deja de ser legible. */
  optionCount: z.number().int().min(2).max(4).default(4),
  /** Enseñar las opciones ya con el audio, o solo cuando termina el fragmento. */
  showOptionsFromStart: z.boolean().default(true),
  /** Si se puede rectificar antes de que cierre la ronda. */
  allowChangeAnswer: z.boolean().default(false),
  wrongAnswerPenalty: z.number().int().max(0).default(0),
  /** Cuánto se parecen los distractores a la respuesta correcta. */
  distractorDifficulty: z.enum(['FACIL', 'MEDIA', 'DIFICIL']).default('MEDIA'),
});

export const freeTextConfigSchema = z.object({
  mode: z.literal('FREE_TEXT'),
  configVersion,
  questionTypes: z.array(z.enum(FREE_TEXT_QUESTION_TYPES)).min(1).default(['SONG_TITLE']),
  /** `null` = intentos ilimitados hasta que se agote el tiempo. */
  attempts: z.number().int().min(1).max(5).nullable().default(1),
  /** Aceptar erratas razonables. Los umbrales dependen de la longitud. */
  fuzzyEnabled: z.boolean().default(true),
});

export const survivalConfigSchema = z.object({
  mode: z.literal('SURVIVAL'),
  configVersion,
  lives: z.number().int().min(1).max(10).default(3),
  /** Supervivencia no evalúa nada por su cuenta: reutiliza otro modo. */
  roundKind: z.enum(['MULTIPLE_CHOICE', 'FREE_TEXT']).default('MULTIPLE_CHOICE'),
  loseLifeOnNoAnswer: z.boolean().default(true),
  /** Recuperar vida al encadenar aciertos; `null` lo desactiva. */
  regainLifeOnStreak: z.number().int().min(2).max(10).nullable().default(null),
  maxRounds: z.number().int().min(1).max(50).nullable().default(null),
  showOthersLives: z.boolean().default(true),
  allowSpectators: z.boolean().default(true),
});

/** Una fila de la mezcla: qué proporción de rondas usa este tipo de reto. */
export const mixedRoundDefinitionSchema = z.object({
  kind: z.enum(['MULTIPLE_CHOICE', 'FREE_TEXT']),
  questionType: z.enum(['SONG_TITLE', 'ARTIST', 'DECADE', 'RELEASE_YEAR', 'ALBUM']),
  /** Peso relativo, en porcentaje sobre el total de rondas. */
  weight: z.number().int().min(1).max(100),
});

export const mixedConfigSchema = z.object({
  mode: z.literal('MIXED'),
  configVersion,
  preset: z.enum(['EQUILIBRADO', 'SOLO_RECONOCIMIENTO', 'PERSONALIZADO']).default('EQUILIBRADO'),
  distribution: z
    .array(mixedRoundDefinitionSchema)
    .min(1)
    .default([
      { kind: 'MULTIPLE_CHOICE', questionType: 'SONG_TITLE', weight: 30 },
      { kind: 'MULTIPLE_CHOICE', questionType: 'ARTIST', weight: 20 },
      { kind: 'MULTIPLE_CHOICE', questionType: 'DECADE', weight: 20 },
      { kind: 'FREE_TEXT', questionType: 'SONG_TITLE', weight: 20 },
      { kind: 'FREE_TEXT', questionType: 'ARTIST', weight: 10 },
    ]),
});

/**
 * La unión discriminada por `mode` es lo que hace que no haga falta un `switch`
 * con `as` por toda la aplicación: quien lee una configuración validada ya sabe
 * exactamente qué campos tiene.
 */
export const gameModeConfigSchema = z.discriminatedUnion('mode', [
  musicBingoConfigSchema,
  multipleChoiceConfigSchema,
  freeTextConfigSchema,
  survivalConfigSchema,
  mixedConfigSchema,
]);

export type MusicBingoConfig = z.infer<typeof musicBingoConfigSchema>;
export type MultipleChoiceConfig = z.infer<typeof multipleChoiceConfigSchema>;
export type FreeTextConfig = z.infer<typeof freeTextConfigSchema>;
export type SurvivalConfig = z.infer<typeof survivalConfigSchema>;
export type MixedConfig = z.infer<typeof mixedConfigSchema>;
export type MixedRoundDefinition = z.infer<typeof mixedRoundDefinitionSchema>;

export type GameModeConfig = z.infer<typeof gameModeConfigSchema>;

/** La configuración de un modo concreto, sin tener que estrechar a mano. */
export type ConfigForMode<M extends GameMode> = Extract<GameModeConfig, { mode: M }>;

const SCHEMA_BY_MODE = {
  MUSIC_BINGO: musicBingoConfigSchema,
  MULTIPLE_CHOICE: multipleChoiceConfigSchema,
  FREE_TEXT: freeTextConfigSchema,
  SURVIVAL: survivalConfigSchema,
  MIXED: mixedConfigSchema,
} as const;

/**
 * Configuración por defecto de un modo: la que se guarda si el anfitrión no
 * toca nada. Se obtiene del propio esquema para que no pueda desincronizarse
 * de los `default()` de arriba.
 */
export function defaultConfigForMode<M extends GameMode>(mode: M): ConfigForMode<M> {
  return SCHEMA_BY_MODE[mode].parse({ mode }) as ConfigForMode<M>;
}

/**
 * Valida una configuración desconocida (viene de la red o de la columna JSON).
 * Lanza si no encaja: preferimos fallar al escribir que jugar con reglas que
 * nadie ha validado.
 */
export function parseGameModeConfig(input: unknown): GameModeConfig {
  return gameModeConfigSchema.parse(input);
}

/**
 * Igual que `parseGameModeConfig`, pero exigiendo un modo concreto.
 *
 * Es la que usa el servidor al cargar una partida: el modo lo manda la partida
 * persistida, nunca el cliente, así que una configuración cuyo `mode` no
 * coincide es un dato corrupto y debe fallar.
 */
export function parseConfigForMode<M extends GameMode>(mode: M, input: unknown): ConfigForMode<M> {
  const parsed = SCHEMA_BY_MODE[mode].parse(input);
  if (parsed.mode !== mode) {
    throw new Error(`La configuración dice ser de ${parsed.mode} pero la partida es de ${mode}`);
  }
  return parsed as ConfigForMode<M>;
}

/**
 * Lectura tolerante para partidas ya guardadas.
 *
 * Las partidas anteriores a Gramola no tienen `modeConfig`: son bingo a ciegas,
 * que es como se jugaba. Devolver el valor por defecto en lugar de fallar es lo
 * que permite abrir el historial de siempre sin migrar cada fila.
 */
export function readGameModeConfig<M extends GameMode>(mode: M, stored: unknown): ConfigForMode<M> {
  if (stored === null || stored === undefined) return defaultConfigForMode(mode);
  return parseConfigForMode(mode, stored);
}

/**
 * Nombre visible de la variante dentro de un modo, para el historial y la
 * ceremonia. `null` cuando el modo no tiene variantes que merezca la pena
 * nombrar: enseñar «Modo mixto · Modo mixto» no informa de nada.
 */
export function describeGameVariant(config: GameModeConfig): string | null {
  switch (config.mode) {
    case 'MUSIC_BINGO':
      return BINGO_VARIANTS.find((variant) => variant.id === config.revealMode)?.name ?? null;
    case 'SURVIVAL':
      return config.roundKind === 'FREE_TEXT' ? 'Respuesta libre' : 'Con opciones';
    case 'MULTIPLE_CHOICE':
    case 'FREE_TEXT':
      return config.questionTypes.map((type) => QUESTION_TYPE_LABELS[type]).join(' · ');
    case 'MIXED':
      return MIXED_PRESET_LABELS[config.preset];
  }
}

const QUESTION_TYPE_LABELS: Record<string, string> = {
  SONG_TITLE: 'Título',
  ARTIST: 'Artista',
  RELEASE_YEAR: 'Año',
  DECADE: 'Década',
  ALBUM: 'Álbum',
  TITLE_AND_ARTIST: 'Título y artista',
};

const MIXED_PRESET_LABELS: Record<MixedConfig['preset'], string> = {
  EQUILIBRADO: 'Equilibrado',
  SOLO_RECONOCIMIENTO: 'Solo reconocimiento',
  PERSONALIZADO: 'Personalizado',
};
