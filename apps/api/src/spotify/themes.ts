/**
 * Colecciones temáticas que mantiene la aplicación.
 *
 * Se construyen buscando en Spotify porque sus listas editoriales («Top 50
 * España» y demás) ya no están abiertas a aplicaciones de terceros. Cada tema
 * es una o varias consultas cuyos resultados se juntan.
 */
export type Theme = {
  key: string;
  name: string;
  description: string;
  /** Consultas de búsqueda, con la sintaxis de filtros de Spotify. */
  queries: string[];
};

export const THEMES: Theme[] = [
  {
    key: 'exitos-espana',
    name: 'Éxitos en España',
    description: 'Lo que ha sonado en todas partes por aquí en los últimos años.',
    queries: ['genre:latin year:2021-2026', 'genre:"spanish pop" year:2020-2026'],
  },
  {
    key: 'pop-actual',
    name: 'Pop de ahora',
    description: 'Las que reconoce todo el mundo desde el primer segundo.',
    queries: ['genre:pop year:2022-2026'],
  },
  {
    key: 'rock-80',
    name: 'Rock de los 80',
    description: 'Guitarras, pelo y estribillos para cantar a gritos.',
    queries: ['genre:rock year:1980-1989'],
  },
  {
    key: 'rock-90',
    name: 'Rock de los 90',
    description: 'La década en la que todo sonaba distorsionado.',
    queries: ['genre:rock year:1990-1999'],
  },
  {
    key: 'fiesta-2000',
    name: 'Fiesta de los 2000',
    description: 'Las que ponían en todas las bodas y siguen funcionando.',
    queries: ['genre:dance year:2000-2009', 'genre:pop year:2000-2009'],
  },
  {
    key: 'reggaeton',
    name: 'Reguetón',
    description: 'Perreo del bueno, del clásico al de ayer mismo.',
    // `genre:reggaeton` casi no devuelve nada; como texto libre sí funciona
    queries: ['reggaeton year:2015-2026', 'reggaeton perreo year:2010-2026'],
  },
];

/**
 * Mínimo de canciones que tienen que sonar para publicar un tema. Por debajo
 * de esto una partida se queda coja: con cartones de 5×5 hacen falta 25.
 */
export const MIN_PLAYABLE = 30;

/** Cuántas candidatas se piden por tema antes de descartar las que no suenan. */
export const CANDIDATES_PER_THEME = 90;

export type ThemeOutcome =
  | { key: string; status: 'built'; playable: number; discarded: number }
  | { key: string; status: 'kept'; playable: number; reason: string }
  | { key: string; status: 'failed'; reason: string };

/**
 * Decide si una construcción puede sustituir a la anterior. Un refresco nunca
 * debe dejar un tema peor de lo que estaba: si Spotify devuelve poco o el
 * audio no se resuelve, se conserva lo que ya había.
 */
export function shouldPublish(playable: number, minimum: number = MIN_PLAYABLE): boolean {
  return playable >= minimum;
}
