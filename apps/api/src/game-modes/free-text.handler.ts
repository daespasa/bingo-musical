import { Injectable } from '@nestjs/common';
import {
  computeSpeedBonus,
  evaluateAnswer,
  parseConfigForMode,
  type AnswerEvaluation,
  type ConfigForMode,
  type FreeTextQuestionType,
} from '@bingo/shared';
import type {
  CreateRoundContext,
  EvaluateAnswerContext,
  GameModeHandler,
  GameProgressContext,
  ScoreContext,
  ScoreEventInput,
} from './game-mode-handler';

/**
 * La ronda de respuesta libre en el servidor.
 *
 * `expected` es la solución. Como en el quiz, no se serializa hacia el
 * cliente: lo que viaja es `FreeTextRoundPublicView`, que solo lleva el
 * enunciado.
 */
export type FreeTextRoundPayload = {
  type: FreeTextQuestionType;
  prompt: string;
  expected: { text: string; aliases: string[]; kind: 'TITLE' | 'ARTIST' };
};

export type FreeTextAnswer = { text: string };

export type FreeTextResult = AnswerEvaluation & { correct: boolean };

const PROMPTS: Record<FreeTextQuestionType, string> = {
  SONG_TITLE: '¿Cómo se llama esta canción?',
  ARTIST: '¿De quién es esta canción?',
  TITLE_AND_ARTIST: 'Escribe título y artista',
};

@Injectable()
export class FreeTextHandler implements GameModeHandler<'FREE_TEXT'> {
  readonly mode = 'FREE_TEXT' as const;

  validateConfig(config: unknown): ConfigForMode<'FREE_TEXT'> {
    return parseConfigForMode('FREE_TEXT', config);
  }

  createRound(context: CreateRoundContext<'FREE_TEXT'>): Promise<FreeTextRoundPayload> {
    const { config, track, index } = context;

    // Se rota por tipo, igual que en el quiz: con varios elegidos, una partida
    // corta no debería repetir el mismo cinco veces por mala suerte.
    const types = config.questionTypes;
    const type = types[index % types.length]!;

    return Promise.resolve({
      type,
      prompt: PROMPTS[type],
      expected: expectedFor(type, track),
    });
  }

  evaluateAnswer(
    context: EvaluateAnswerContext<'FREE_TEXT', FreeTextRoundPayload, FreeTextAnswer>,
  ): Promise<FreeTextResult> {
    // La evaluación es del servidor y con reglas explícitas: nada de IA ni de
    // servicios externos decidiendo si una respuesta vale.
    const evaluation = evaluateAnswer(context.answer.text, context.round.expected, {
      fuzzy: context.config.fuzzyEnabled,
    });
    return Promise.resolve({ ...evaluation, correct: evaluation.accepted });
  }

  calculateScore(context: ScoreContext<'FREE_TEXT', FreeTextResult>): ScoreEventInput[] {
    const { scoring } = context;
    if (!context.result.correct) return [];

    const events: ScoreEventInput[] = [
      { type: 'CORRECT_ANSWER', points: scoring.correctMarkPoints },
    ];

    const bonus = computeSpeedBonus(context.latencyMs, context.windowMs, scoring.speedBonusMax);
    if (bonus > 0) events.push({ type: 'SPEED_BONUS', points: bonus });

    const streak = context.streak + 1;
    if (streak > 0 && streak % STREAK_LENGTH === 0) {
      events.push({ type: 'STREAK_BONUS', points: scoring.streakBonusPoints });
    }

    return events;
  }

  isGameFinished(context: GameProgressContext<'FREE_TEXT'>): boolean {
    return context.roundIndex >= context.totalRounds;
  }
}

const STREAK_LENGTH = 3;

function expectedFor(
  type: FreeTextQuestionType,
  track: { title: string; artist: string },
): FreeTextRoundPayload['expected'] {
  switch (type) {
    case 'SONG_TITLE':
      return { text: track.title, aliases: [], kind: 'TITLE' };
    case 'ARTIST':
      return { text: track.artist, aliases: [], kind: 'ARTIST' };
    case 'TITLE_AND_ARTIST':
      // Se acepta en los dos órdenes: nadie debería perder por escribir
      // «artista - título» en lugar de «título - artista».
      return {
        text: `${track.title} ${track.artist}`,
        aliases: [`${track.artist} ${track.title}`],
        kind: 'TITLE',
      };
  }
}

/** Lo que de una ronda de respuesta libre puede ver el cliente. */
export type FreeTextRoundPublicView = {
  type: FreeTextQuestionType;
  prompt: string;
};

/**
 * Igual que en el quiz: una sola puerta de salida hacia la red, para que un
 * campo sensible añadido a la ronda no se cuele solo.
 */
export function toPublicFreeTextRound(round: FreeTextRoundPayload): FreeTextRoundPublicView {
  return { type: round.type, prompt: round.prompt };
}
