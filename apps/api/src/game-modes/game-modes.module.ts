import { Global, Module } from '@nestjs/common';
import { GameModeRegistry } from './game-mode.registry';
import { MusicBingoHandler } from './music-bingo.handler';
import { MultipleChoiceHandler } from './multiple-choice.handler';
import { FreeTextHandler } from './free-text.handler';

/**
 * Global porque el registro lo necesitan tanto la creación de partidas como el
 * motor en tiempo real, y no aporta nada obligar a cada módulo a importarlo.
 */
@Global()
@Module({
  providers: [MusicBingoHandler, MultipleChoiceHandler, FreeTextHandler, GameModeRegistry],
  exports: [GameModeRegistry],
})
export class GameModesModule {}
