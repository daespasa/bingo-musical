import { Injectable } from '@nestjs/common';
import {
  computeSpeedBonus,
  createRng,
  parseConfigForMode,
  type ConfigForMode,
  type MultipleChoiceQuestionType,
} from '@bingo/shared';
import type {
  CreateRoundContext,
  EvaluateAnswerContext,
  GameModeHandler,
  GameProgressContext,
  ScoreContext,
  ScoreEventInput,
} from './game-mode-handler';
import { buildQuizQuestion, supportedQuestionTypes } from './question-builder';

/** Una opción de respuesta con su subtítulo opcional (el artista, cuando aplica). */
export type QuizOption = { text: string; subtitle: string | null };

/**
 * La ronda de quiz tal y como la conoce el servidor.
 *
 * `correctText` vive aquí porque el motor lo necesita para persistir y para el
 * reveal, pero **nunca** se serializa hacia el cliente: lo que viaja es
 * `QuizRoundPublicView`, que no lo incluye.
 */
export type QuizRoundPayload = {
  type: MultipleChoiceQuestionType;
  prompt: string;
  correctText: string;
  /** Opciones en el orden definitivo; el índice es su posición. */
  options: QuizOption[];
  correctIndex: number;
};

export type QuizAnswer = { optionIndex: number };

export type QuizResult = { correct: boolean };

/**
 * El distractor que más gente se ha tragado, si de verdad ha engañado.
 *
 * Función pura para poder probar la selección sin montar el motor completo:
 * recibe las opciones ya resueltas (no strings) para que un cambio de forma
 * en `QuizOption` no pueda colarse silenciosamente en el highlight (ver
 * fallo detectado y corregido en la Tarea 4: se guardaba el objeto opción
 * entero en vez de su `text`).
 */
export function pickPopularDistractor(
  options: readonly QuizOption[],
  correctIndex: number,
  counts: readonly number[],
  correctAnswersCount: number,
): { text: string; count: number } | null {
  let worst = -1;
  let worstCount = 0;
  counts.forEach((count, index) => {
    if (index === correctIndex) return;
    if (count > worstCount) {
      worst = index;
      worstCount = count;
    }
  });
  const worstOption = worst >= 0 ? options[worst] : undefined;
  if (worstOption && worstCount >= 2 && worstCount > correctAnswersCount) {
    return { text: worstOption.text, count: worstCount };
  }
  return null;
}

@Injectable()
export class MultipleChoiceHandler implements GameModeHandler<'MULTIPLE_CHOICE'> {
  readonly mode = 'MULTIPLE_CHOICE' as const;

  validateConfig(config: unknown): ConfigForMode<'MULTIPLE_CHOICE'> {
    return parseConfigForMode('MULTIPLE_CHOICE', config);
  }

  createRound(context: CreateRoundContext<'MULTIPLE_CHOICE'>): Promise<QuizRoundPayload> {
    const { config, track, pool, index, roomId } = context;

    // Semilla estable por ronda: si un jugador reconecta, tiene que ver
    // exactamente la misma pregunta y las mismas opciones que el resto.
    const rng = createRng(`quiz:${roomId}:${index}`);

    // Solo se usan los tipos que la colección puede sostener; pedir una
    // pregunta de década sin años daría una pregunta sin distractores.
    const usable = supportedQuestionTypes(pool, config.questionTypes);
    const types = usable.length > 0 ? usable : ['SONG_TITLE' as const];

    // Se rota por tipo en vez de sortear, para que una partida corta no repita
    // el mismo tipo cinco veces por mala suerte.
    const type = types[index % types.length]!;

    const draft =
      buildQuizQuestion({ type, track, pool, optionCount: config.optionCount, rng }) ??
      buildQuizQuestion({
        type: 'SONG_TITLE',
        track,
        pool,
        optionCount: config.optionCount,
        rng,
      });

    if (!draft) {
      throw new Error('La colección no permite construir preguntas con opciones');
    }

    return Promise.resolve({
      type: draft.type,
      prompt: draft.prompt,
      correctText: draft.correctText,
      options: draft.options,
      correctIndex: draft.options.findIndex((option) => option.text === draft.correctText),
    });
  }

  evaluateAnswer(
    context: EvaluateAnswerContext<'MULTIPLE_CHOICE', QuizRoundPayload, QuizAnswer>,
  ): Promise<QuizResult> {
    // La comparación ocurre en el servidor contra la ronda persistida: el
    // cliente manda qué ha pulsado, nunca si ha acertado.
    return Promise.resolve({
      correct: context.answer.optionIndex === context.round.correctIndex,
    });
  }

  calculateScore(context: ScoreContext<'MULTIPLE_CHOICE', QuizResult>): ScoreEventInput[] {
    const { scoring, config } = context;

    if (!context.result.correct) {
      // La penalización por fallo es opcional y por defecto no existe:
      // castigar el intento desincentiva jugar.
      return config.wrongAnswerPenalty < 0
        ? [{ type: 'WRONG_ANSWER', points: config.wrongAnswerPenalty }]
        : [];
    }

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

  isGameFinished(context: GameProgressContext<'MULTIPLE_CHOICE'>): boolean {
    return context.roundIndex >= context.totalRounds;
  }
}

const STREAK_LENGTH = 3;

/**
 * Lo que de una ronda de quiz puede ver el cliente antes del reveal.
 *
 * Es una función y no un `Omit` suelto para que exista **un solo sitio** por
 * el que la ronda sale hacia la red. Si mañana se añade un campo sensible a
 * `QuizRoundPayload`, no se cuela solo: hay que añadirlo aquí a mano.
 */
export type QuizRoundPublicView = {
  type: MultipleChoiceQuestionType;
  prompt: string;
  options: QuizOption[];
};

export function toPublicQuizRound(round: QuizRoundPayload): QuizRoundPublicView {
  return {
    type: round.type,
    prompt: round.prompt,
    options: round.options,
  };
}
