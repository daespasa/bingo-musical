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

/**
 * La ronda de Supervivencia es la de otro modo.
 *
 * El discriminante dice cuál, para que el motor sepa qué superficie montar sin
 * inspeccionar la forma del objeto.
 */
export type SurvivalRoundPayload =
  | { kind: 'MULTIPLE_CHOICE'; quiz: QuizRoundPayload }
  | { kind: 'FREE_TEXT'; freeText: FreeTextRoundPayload };

export type SurvivalAnswer = { optionIndex?: number; text?: string };

export type SurvivalResult = { correct: boolean };

/**
 * Supervivencia.
 *
 * No evalúa nada por su cuenta: reutiliza el evaluador del quiz o el de la
 * respuesta libre, según cómo se haya configurado. Lo único suyo son las
 * vidas, la eliminación y el final de partida, que viven en `survival-rules`.
 *
 * Duplicar aquí la generación de preguntas o la comparación de respuestas
 * habría significado mantener dos veces la parte difícil —y el *fuzzy* de la
 * respuesta libre es exactamente la parte difícil—.
 */
@Injectable()
export class SurvivalHandler implements GameModeHandler<'SURVIVAL'> {
  readonly mode = 'SURVIVAL' as const;

  constructor(
    private readonly quiz: MultipleChoiceHandler,
    private readonly freeText: FreeTextHandler,
  ) {}

  validateConfig(config: unknown): ConfigForMode<'SURVIVAL'> {
    return parseConfigForMode('SURVIVAL', config);
  }

  async createRound(context: CreateRoundContext<'SURVIVAL'>): Promise<SurvivalRoundPayload> {
    const { config } = context;

    if (config.roundKind === 'FREE_TEXT') {
      const freeText = await this.freeText.createRound({
        ...context,
        config: {
          mode: 'FREE_TEXT',
          configVersion: config.configVersion,
          questionTypes: ['SONG_TITLE'],
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
        configVersion: config.configVersion,
        questionTypes: ['SONG_TITLE'],
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
    context: EvaluateAnswerContext<'SURVIVAL', SurvivalRoundPayload, SurvivalAnswer>,
  ): Promise<SurvivalResult> {
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

  /**
   * Puntuación de Supervivencia.
   *
   * Se puntúa aparte de las vidas: el marcador sirve para desempatar y para el
   * historial, pero quien gana es quien queda en pie, no quien más puntos hace.
   */
  calculateScore(context: ScoreContext<'SURVIVAL', SurvivalResult>): ScoreEventInput[] {
    if (!context.result.correct) return [];
    return [{ type: 'CORRECT_ANSWER', points: context.scoring.correctMarkPoints }];
  }

  /**
   * Final por agotamiento de rondas o por quedar una sola persona en pie.
   *
   * El contexto solo trae quién sigue activo, que basta para lo segundo. El
   * motor, que sí conoce las vidas de todo el mundo, usa además
   * `isSurvivalFinished` para el resto del desempate.
   */
  isGameFinished(context: GameProgressContext<'SURVIVAL'>): boolean {
    if (context.activeParticipantIds.length <= 1) return true;

    const limite =
      context.config.maxRounds === null
        ? context.totalRounds
        : Math.min(context.config.maxRounds, context.totalRounds);
    return context.roundIndex >= limite;
  }
}
