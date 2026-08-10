/**
 * Catálogo de modos de juego de Gramola.
 *
 * `Game` representa cualquier partida; el modo decide qué reglas se aplican.
 * Este archivo describe **qué** modos existen y cómo se presentan; las reglas
 * viven en el handler de cada modo, en el servidor. El cliente nunca elige el
 * handler: el servidor lo carga del modo persistido en la partida.
 */

/** Modos que el dominio sabe representar. Coincide con el enum de Prisma. */
export const GAME_MODES = [
  'MUSIC_BINGO',
  'MULTIPLE_CHOICE',
  'FREE_TEXT',
  'SURVIVAL',
  'MIXED',
] as const;

export type GameMode = (typeof GAME_MODES)[number];

/**
 * Modos previstos que todavía no tienen enum propio.
 *
 * No se añaden a `GAME_MODES` hasta que estén implementados de principio a
 * fin: un valor en el enum es una promesa de que el servidor sabe jugarlo.
 * Están aquí para que la hoja de ruta sea explícita y no se pierda.
 */
export const PLANNED_GAME_MODES = [
  'SONG_DUEL',
  'TIMELINE_ORDER',
  'COVER_GUESS',
  'ODD_ONE_OUT',
  'LIGHTNING_STREAK',
  'PROGRESSIVE_HINTS',
  'SECONDS_AUCTION',
  'MUSICAL_IMPOSTOR',
  'WHO_ADDED_THIS_SONG',
] as const;

export type PlannedGameMode = (typeof PLANNED_GAME_MODES)[number];

/** Cómo de exigente es el modo para quien juega, para orientar al anfitrión. */
export type ModeDifficulty = 'RELAJADA' | 'MEDIA' | 'EXIGENTE';

/**
 * Estado de cada modo de cara al selector.
 *
 * `PROXIMAMENTE` significa que el dominio lo contempla pero no se puede jugar.
 * El selector debe impedir elegirlo: una tarjeta que no lleva a ninguna parte
 * es peor que no enseñar la tarjeta.
 */
export type ModeAvailability = 'DISPONIBLE' | 'PROXIMAMENTE';

export type GameModeDescriptor = {
  id: GameMode;
  /** Nombre visible; nunca se deriva del identificador técnico. */
  name: string;
  /** Una frase: qué se hace en este modo. */
  description: string;
  /** Rango de jugadores con el que el modo funciona bien. */
  recommendedPlayers: { min: number; max: number };
  difficulty: ModeDifficulty;
  supportsProjector: boolean;
  supportsRemote: boolean;
  availability: ModeAvailability;
};

/**
 * El orden es el del selector: primero el modo insignia, luego los que se
 * apoyan en reconocer música, y el mixto al final porque combina los demás.
 */
export const GAME_MODE_CATALOG: readonly GameModeDescriptor[] = [
  {
    id: 'MUSIC_BINGO',
    name: 'Bingo musical',
    description: 'Completa tu cartón mientras suenan tus canciones.',
    recommendedPlayers: { min: 2, max: 40 },
    difficulty: 'RELAJADA',
    supportsProjector: true,
    supportsRemote: true,
    availability: 'DISPONIBLE',
  },
  {
    id: 'MULTIPLE_CHOICE',
    name: 'Quiz musical',
    description: 'Escucha el fragmento y elige la respuesta correcta.',
    recommendedPlayers: { min: 2, max: 60 },
    difficulty: 'MEDIA',
    supportsProjector: true,
    supportsRemote: true,
    availability: 'DISPONIBLE',
  },
  {
    id: 'FREE_TEXT',
    name: 'Adivina la canción',
    description: 'Sin opciones: escribe lo que estás escuchando.',
    recommendedPlayers: { min: 2, max: 30 },
    difficulty: 'EXIGENTE',
    supportsProjector: true,
    supportsRemote: true,
    availability: 'DISPONIBLE',
  },
  {
    id: 'SURVIVAL',
    name: 'Supervivencia',
    description: 'Cada error cuesta una vida. ¿Quién llegará al final?',
    recommendedPlayers: { min: 3, max: 40 },
    difficulty: 'EXIGENTE',
    supportsProjector: true,
    supportsRemote: true,
    availability: 'PROXIMAMENTE',
  },
  {
    id: 'MIXED',
    name: 'Modo mixto',
    description: 'Cada ronda cambia de reto: opciones, respuesta libre, décadas.',
    recommendedPlayers: { min: 2, max: 40 },
    difficulty: 'MEDIA',
    supportsProjector: true,
    supportsRemote: true,
    availability: 'PROXIMAMENTE',
  },
] as const;

const BY_ID = new Map(GAME_MODE_CATALOG.map((mode) => [mode.id, mode]));

export function describeGameMode(mode: GameMode): GameModeDescriptor {
  const descriptor = BY_ID.get(mode);
  if (!descriptor) throw new Error(`Modo de juego desconocido: ${mode}`);
  return descriptor;
}

/** Modos que se pueden jugar hoy de principio a fin. */
export function playableGameModes(): GameModeDescriptor[] {
  return GAME_MODE_CATALOG.filter((mode) => mode.availability === 'DISPONIBLE');
}

export function isPlayableGameMode(mode: string): mode is GameMode {
  return BY_ID.get(mode as GameMode)?.availability === 'DISPONIBLE';
}

// ---------- Variantes del bingo ----------

/**
 * Qué sabe el jugador mientras suena la canción.
 *
 * `HIDDEN_UNTIL_REVEAL` es el bingo de toda la vida: hay que reconocerla de
 * oído. `VISIBLE_FROM_START` enseña título y artista desde el primer segundo,
 * así que el reto pasa a ser encontrarla en el cartón; es el que funciona con
 * grupos de niveles musicales muy distintos.
 */
export const BINGO_REVEAL_MODES = ['HIDDEN_UNTIL_REVEAL', 'VISIBLE_FROM_START'] as const;
export type BingoRevealMode = (typeof BINGO_REVEAL_MODES)[number];

export type BingoVariantDescriptor = {
  id: BingoRevealMode;
  name: string;
  description: string;
};

export const BINGO_VARIANTS: readonly BingoVariantDescriptor[] = [
  {
    id: 'HIDDEN_UNTIL_REVEAL',
    name: 'Bingo a ciegas',
    description: 'Suena el fragmento y el título no aparece: hay que reconocerla de oído.',
  },
  {
    id: 'VISIBLE_FROM_START',
    name: 'Bingo clásico',
    description:
      'La canción aparece desde el principio. Encuéntrala rápido en tu cartón y completa línea o bingo.',
  },
] as const;

// ---------- Tipos de pregunta ----------

/** Preguntas con opciones. El dominio las contempla; el modo aún no se juega. */
export const MULTIPLE_CHOICE_QUESTION_TYPES = [
  'SONG_TITLE',
  'ARTIST',
  'RELEASE_YEAR',
  'DECADE',
  'ALBUM',
] as const;
export type MultipleChoiceQuestionType = (typeof MULTIPLE_CHOICE_QUESTION_TYPES)[number];

/** Preguntas de respuesta escrita. */
export const FREE_TEXT_QUESTION_TYPES = ['SONG_TITLE', 'ARTIST', 'TITLE_AND_ARTIST'] as const;
export type FreeTextQuestionType = (typeof FREE_TEXT_QUESTION_TYPES)[number];
