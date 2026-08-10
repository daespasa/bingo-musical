import { BadRequestException, Injectable } from '@nestjs/common';
import { describeGameMode, type ConfigForMode, type GameMode } from '@bingo/shared';
import type { GameModeHandler } from './game-mode-handler';
import { MusicBingoHandler } from './music-bingo.handler';
import { MultipleChoiceHandler } from './multiple-choice.handler';
import { FreeTextHandler } from './free-text.handler';
import { SurvivalHandler } from './survival.handler';

/**
 * Resuelve el handler de cada modo.
 *
 * Punto de seguridad: el modo **siempre** se lee de la partida persistida,
 * nunca de lo que manda el cliente. Si el navegador pudiera elegir handler,
 * podría pedir que su bingo se evaluara con las reglas de otro modo.
 */
/**
 * Un handler de *algún* modo concreto.
 *
 * No vale `GameModeHandler<GameMode>`: sus métodos reciben la configuración del
 * modo, así que un handler de bingo no es un handler «de cualquier modo». La
 * unión de handlers concretos sí es almacenable, y `resolve` recupera el tipo
 * exacto a partir del modo pedido.
 */
type AnyGameModeHandler = { [M in GameMode]: GameModeHandler<M> }[GameMode];

/**
 * Handler concreto de cada modo.
 *
 * Sin este mapa, `resolve` devolvería un handler con las cargas útiles en
 * `unknown` y quien lo usa tendría que hacer conversiones a mano, que es justo
 * lo que la unión discriminada venía a evitar.
 */
type HandlerByMode = {
  MUSIC_BINGO: MusicBingoHandler;
  MULTIPLE_CHOICE: MultipleChoiceHandler;
  FREE_TEXT: FreeTextHandler;
  SURVIVAL: SurvivalHandler;
  MIXED: GameModeHandler<'MIXED'>;
};

@Injectable()
export class GameModeRegistry {
  private readonly handlers = new Map<GameMode, AnyGameModeHandler>();

  constructor(
    musicBingo: MusicBingoHandler,
    multipleChoice: MultipleChoiceHandler,
    freeText: FreeTextHandler,
    survival: SurvivalHandler,
  ) {
    this.register(musicBingo);
    this.register(multipleChoice);
    this.register(freeText);
    this.register(survival);
  }

  private register(handler: AnyGameModeHandler): void {
    this.handlers.set(handler.mode, handler);
  }

  /** Los modos que además de estar en el catálogo tienen handler registrado. */
  supportedModes(): GameMode[] {
    return [...this.handlers.keys()];
  }

  isSupported(mode: GameMode): boolean {
    return this.handlers.has(mode);
  }

  /**
   * Handler de un modo. Lanza si no hay ninguno: es mejor negarse a empezar
   * que arrancar una sala que nadie sabe conducir.
   */
  resolve<M extends GameMode>(mode: M): HandlerByMode[M] {
    const handler = this.handlers.get(mode);
    if (!handler) {
      throw new BadRequestException(
        `El modo «${describeGameMode(mode).name}» todavía no se puede jugar`,
      );
    }
    return handler as unknown as HandlerByMode[M];
  }

  /**
   * Valida la configuración de un modo con su propio esquema.
   *
   * Se usa tanto al crear la partida como al cargarla, que es lo que impide
   * que una fila JSON manipulada a mano cambie las reglas a mitad de partida.
   */
  validateConfig<M extends GameMode>(mode: M, config: unknown): ConfigForMode<M> {
    try {
      // El handler devuelve la configuración de su propio modo; con `M`
      // genérico TypeScript no puede estrecharlo solo, pero `resolve` ya
      // garantiza que el handler es el del modo pedido.
      return this.resolve(mode).validateConfig(config) as ConfigForMode<M>;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      const detail = error instanceof Error ? error.message : 'formato desconocido';
      throw new BadRequestException(`Configuración no válida para ${mode}: ${detail}`);
    }
  }
}
