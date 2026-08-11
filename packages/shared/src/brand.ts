/**
 * Identidad del producto en un único sitio.
 *
 * El nombre comercial se consume desde aquí para que cambiarlo no obligue a
 * tocar decenas de archivos. Es deliberadamente independiente del dominio: la
 * terminología del bingo (cartón, línea, bingo) no vive en esta constante,
 * porque pertenece a un modo de juego concreto y no a la marca.
 */
export const APP_BRAND = {
  name: 'Gramola',
  shortName: 'Gramola',
  /** Reclamo principal, para cabeceras y aviso de instalación. */
  tagline: 'Juega, escucha y adivina',
  /** Reclamo de la portada, más cercano al grupo que juega. */
  heroTagline: 'Tu música. Vuestro juego.',
  description: 'Juegos musicales multijugador para jugar con amigos, a distancia o en eventos.',
  /** Descripción larga, para metadata y Swagger. */
  longDescription:
    'Gramola es una plataforma de juegos musicales en directo. Crea una sala, comparte el código y juega desde cualquier móvil mediante bingo, preguntas, reconocimiento de canciones y otros desafíos musicales.',
} as const;

export type AppBrand = typeof APP_BRAND;

/** Título de página con la marca detrás, con el separador del sistema visual. */
export function brandTitle(section: string): string {
  return `${section} · ${APP_BRAND.name}`;
}
