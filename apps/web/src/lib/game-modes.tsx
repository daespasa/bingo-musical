import { AudioLines, Grid3x3, Heart, ListChecks, Shuffle } from 'lucide-react';
import type { ComponentType } from 'react';
import type { GameMode } from '@bingo/shared';

/**
 * Registro de modos en el cliente.
 *
 * Solo aporta lo que el catálogo compartido no puede llevar: los componentes.
 * El nombre, la descripción, la dificultad y la disponibilidad viven en
 * `@bingo/shared` para que cliente y servidor no puedan discrepar sobre qué se
 * puede jugar.
 *
 * Cada modo tiene su propia figura, no solo su propio color: quien no
 * distingue colores tiene que poder diferenciarlos igual.
 */
export type GameModeVisual = {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  /** Texto del icono para lectores de pantalla, cuando va suelto. */
  iconLabel: string;
};

export const GAME_MODE_VISUALS: Record<GameMode, GameModeVisual> = {
  MUSIC_BINGO: { icon: Grid3x3, iconLabel: 'Cuadrícula de cartón' },
  MULTIPLE_CHOICE: { icon: ListChecks, iconLabel: 'Lista de respuestas' },
  FREE_TEXT: { icon: AudioLines, iconLabel: 'Onda de sonido' },
  SURVIVAL: { icon: Heart, iconLabel: 'Vidas' },
  MIXED: { icon: Shuffle, iconLabel: 'Pistas mezcladas' },
};
