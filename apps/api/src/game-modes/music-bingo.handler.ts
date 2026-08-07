import { Injectable } from '@nestjs/common';
import {
  computeSpeedBonus,
  parseConfigForMode,
  type ConfigForMode,
  type MusicBingoConfig,
} from '@bingo/shared';
import type {
  CreateRoundContext,
  EvaluateAnswerContext,
  GameModeHandler,
  GameProgressContext,
  RoundTrack,
  ScoreContext,
  ScoreEventInput,
} from './game-mode-handler';

/** Lo que se reparte a la sala en una ronda de bingo. */
export type BingoRoundPayload = {
  trackId: string;
  /**
   * Título y artista cuando la variante los enseña desde el principio.
   *
   * En «bingo a ciegas» es `null` y no viaja al cliente hasta el reveal: el
   * reto es reconocerla de oído, así que mandarlo antes sería regalar la
   * respuesta.
   */
  revealed: { title: string; artist: string } | null;
};

/** Lo que manda quien juega: la casilla que cree que corresponde. */
export type BingoAnswer = { cellTrackId: string | null };

export type BingoResult = {
  correct: boolean;
};

/**
 * El bingo musical, en sus dos variantes.
 *
 * Ambas comparten cartones, generación, validación, línea, bingo, ranking,
 * ceremonia y The Show: lo único que cambia es qué se sabe de la canción
 * mientras suena y, en consecuencia, qué se premia.
 */
@Injectable()
export class MusicBingoHandler implements GameModeHandler<'MUSIC_BINGO'> {
  readonly mode = 'MUSIC_BINGO' as const;

  validateConfig(config: unknown): ConfigForMode<'MUSIC_BINGO'> {
    return parseConfigForMode('MUSIC_BINGO', config);
  }

  createRound(context: CreateRoundContext<'MUSIC_BINGO'>): Promise<BingoRoundPayload> {
    return Promise.resolve({
      trackId: context.track.id,
      revealed: revealedInfo(context.config, context.track),
    });
  }

  evaluateAnswer(
    context: EvaluateAnswerContext<'MUSIC_BINGO', BingoRoundPayload, BingoAnswer>,
  ): Promise<BingoResult> {
    // El veredicto sale de comparar la casilla con la pista que suena, que
    // solo conoce el servidor.
    return Promise.resolve({
      correct: context.answer.cellTrackId === context.round.trackId,
    });
  }

  calculateScore(context: ScoreContext<'MUSIC_BINGO', BingoResult>): ScoreEventInput[] {
    const { scoring } = context;
    if (!context.result.correct) {
      // En bingo clásico la canción está identificada en pantalla, así que
      // fallar no es no reconocerla de oído: es haber tocado otra casilla.
      // Penalizarlo castigaría justo a quien todavía busca en el cartón, que
      // es a quien este modo pretende incluir.
      if (context.config.revealMode === 'VISIBLE_FROM_START') return [];
      return [{ type: 'WRONG_MARK', points: scoring.wrongMarkPenalty }];
    }

    const events: ScoreEventInput[] = [{ type: 'CORRECT_MARK', points: scoring.correctMarkPoints }];

    const bonus = computeSpeedBonus(context.latencyMs, context.windowMs, scoring.speedBonusMax);
    if (bonus > 0) events.push({ type: 'SPEED_BONUS', points: bonus });

    // La racha se cuenta con esta respuesta ya incluida.
    const streak = context.streak + 1;
    if (streak > 0 && streak % STREAK_LENGTH === 0) {
      events.push({ type: 'STREAK_BONUS', points: scoring.streakBonusPoints });
    }

    return events;
  }

  isGameFinished(context: GameProgressContext<'MUSIC_BINGO'>): boolean {
    // El bingo se acaba al agotar las canciones. Cantar bingo también termina
    // la partida, pero eso lo decide la reclamación, no el avance de rondas.
    return context.roundIndex >= context.totalRounds;
  }
}

const STREAK_LENGTH = 3;

/**
 * Qué se enseña de la canción mientras suena.
 *
 * En «bingo clásico» la canción está identificada desde el primer segundo, así
 * que buscarla en el cartón es todo el reto y no tiene sentido penalizar a
 * quien no la reconoce de oído.
 */
export function revealedInfo(
  config: MusicBingoConfig,
  track: Pick<RoundTrack, 'title' | 'artist'>,
): { title: string; artist: string } | null {
  return config.revealMode === 'VISIBLE_FROM_START'
    ? { title: track.title, artist: track.artist }
    : null;
}
