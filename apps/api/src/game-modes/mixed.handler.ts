import { Injectable } from '@nestjs/common';
import { parseConfigForMode, type ConfigForMode } from '@bingo/shared';
import type {
  CreateRoundContext,
  EvaluateAnswerContext,
  GameModeHandler,
  GameProgressContext,
  ScoreContext,
  ScoreEventInput,
} from './game-mode-handler';
import { MultipleChoiceHandler, type QuizRoundPayload } from './multiple-choice.handler';
import { FreeTextHandler, type FreeTextRoundPayload } from './free-text.handler';
import { buildMixedPlan, roundDefinitionAt } from './mixed-plan';

/** La ronda de mixto es la de uno de los modos que combina. */
export type MixedRoundPayload =
  | { kind: 'MULTIPLE_CHOICE'; quiz: QuizRoundPayload }
  | { kind: 'FREE_TEXT'; freeText: FreeTextRoundPayload };

export type MixedAnswer = { optionIndex?: number; text?: string };
export type MixedResult = { correct: boolean };

/**
 * Modo mixto.
 *
 * Cada ronda cambia de reto según el reparto configurado. Como Supervivencia,
 * no evalúa nada por su cuenta: delega en el quiz o en la respuesta libre.
 *
 * El bingo queda fuera de la mezcla a propósito: repartir cartones para una
 * sola ronda suelta obligaría a rehacer la generación y la validación de
 * marcas para un caso que además se juega distinto. Está documentado como
 * trabajo futuro y no se anuncia como disponible.
 */
@Injectable()
export class MixedHandler implements GameModeHandler<'MIXED'> {
  readonly mode = 'MIXED' as const;

  constructor(
    private readonly quiz: MultipleChoiceHandler,
    private readonly freeText: FreeTextHandler,
  ) {}

  validateConfig(config: unknown): ConfigForMode<'MIXED'> {
    return parseConfigForMode('MIXED', config);
  }

  async createRound(context: CreateRoundContext<'MIXED'>): Promise<MixedRoundPayload> {
    const plan = buildMixedPlan(context.config, context.totalRounds);
    const definition = roundDefinitionAt(plan, context.index);

    if (definition?.kind === 'FREE_TEXT') {
      const freeText = await this.freeText.createRound({
        ...context,
        config: {
          mode: 'FREE_TEXT',
          configVersion: context.config.configVersion,
          // El tipo de pregunta lo fija el reparto, no la configuración del
          // modo de respuesta libre.
          questionTypes: [definition.questionType === 'ARTIST' ? 'ARTIST' : 'SONG_TITLE'],
          attempts: 1,
          fuzzyEnabled: true,
        },
      });
      return { kind: 'FREE_TEXT', freeText };
    }

    const quiz = await this.quiz.createRound({
      ...context,
      config: {
        mode: 'MULTIPLE_CHOICE',
        configVersion: context.config.configVersion,
        questionTypes: [definition?.questionType ?? 'SONG_TITLE'],
        optionCount: 4,
        showOptionsFromStart: true,
        allowChangeAnswer: false,
        wrongAnswerPenalty: 0,
        distractorDifficulty: 'MEDIA',
      },
    });
    return { kind: 'MULTIPLE_CHOICE', quiz };
  }

  async evaluateAnswer(
    context: EvaluateAnswerContext<'MIXED', MixedRoundPayload, MixedAnswer>,
  ): Promise<MixedResult> {
    const { round, answer } = context;

    if (round.kind === 'FREE_TEXT') {
      const result = await this.freeText.evaluateAnswer({
        ...context,
        config: {
          mode: 'FREE_TEXT',
          configVersion: context.config.configVersion,
          questionTypes: ['SONG_TITLE'],
          attempts: 1,
          fuzzyEnabled: true,
        },
        round: round.freeText,
        answer: { text: answer.text ?? '' },
      });
      return { correct: result.correct };
    }

    const result = await this.quiz.evaluateAnswer({
      ...context,
      config: {
        mode: 'MULTIPLE_CHOICE',
        configVersion: context.config.configVersion,
        questionTypes: ['SONG_TITLE'],
        optionCount: 4,
        showOptionsFromStart: true,
        allowChangeAnswer: false,
        wrongAnswerPenalty: 0,
        distractorDifficulty: 'MEDIA',
      },
      round: round.quiz,
      answer: { optionIndex: answer.optionIndex ?? -1 },
    });
    return { correct: result.correct };
  }

  calculateScore(context: ScoreContext<'MIXED', MixedResult>): ScoreEventInput[] {
    if (!context.result.correct) return [];
    return [{ type: 'CORRECT_ANSWER', points: context.scoring.correctMarkPoints }];
  }

  isGameFinished(context: GameProgressContext<'MIXED'>): boolean {
    return context.roundIndex >= context.totalRounds;
  }
}
