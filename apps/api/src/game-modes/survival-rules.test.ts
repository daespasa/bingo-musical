import { describe, expect, it } from 'vitest';
import { defaultConfigForMode } from '@bingo/shared';
import {
  applyRoundOutcome,
  initialLifeState,
  isActive,
  isSurvivalFinished,
  sortStandings,
  type LifeState,
  type SurvivalStanding,
} from './survival-rules';

const CONFIG = defaultConfigForMode('SURVIVAL');

function estado(lives: number, eliminatedAtRound: number | null = null): LifeState {
  return { lives, eliminatedAtRound, eliminationOrder: null };
}

function aplicar(
  state: LifeState,
  outcome: { answered: boolean; correct: boolean },
  overrides: Partial<Parameters<typeof applyRoundOutcome>[0]> = {},
) {
  return applyRoundOutcome({
    state,
    outcome,
    config: CONFIG,
    roundIndex: 0,
    streakBefore: 0,
    eliminatedSoFar: 0,
    ...overrides,
  });
}

describe('vidas iniciales', () => {
  it('empieza con las vidas configuradas', () => {
    expect(initialLifeState(CONFIG).lives).toBe(3);
    expect(initialLifeState({ ...CONFIG, lives: 5 }).lives).toBe(5);
  });

  it('empieza en juego', () => {
    expect(isActive(initialLifeState(CONFIG))).toBe(true);
  });
});

describe('acertar y fallar', () => {
  it('acertar mantiene las vidas', () => {
    expect(aplicar(estado(3), { answered: true, correct: true }).lives).toBe(3);
  });

  it('fallar cuesta una vida', () => {
    expect(aplicar(estado(3), { answered: true, correct: false }).lives).toBe(2);
  });

  it('no responder cuesta vida si así se configuró', () => {
    expect(aplicar(estado(3), { answered: false, correct: false }).lives).toBe(2);
  });

  it('no responder no cuesta vida si el anfitrión lo desactivó', () => {
    const config = { ...CONFIG, loseLifeOnNoAnswer: false };
    expect(aplicar(estado(3), { answered: false, correct: false }, { config }).lives).toBe(3);
  });
});

describe('eliminación', () => {
  it('a cero vidas queda eliminado, con la ronda anotada', () => {
    const next = aplicar(estado(1), { answered: true, correct: false }, { roundIndex: 4 });
    expect(next.lives).toBe(0);
    expect(next.eliminatedAtRound).toBe(4);
    expect(isActive(next)).toBe(false);
  });

  it('anota el orden de eliminación', () => {
    const next = aplicar(estado(1), { answered: true, correct: false }, { eliminatedSoFar: 2 });
    expect(next.eliminationOrder).toBe(3);
  });

  it('quien está eliminado no vuelve, ni acertando', () => {
    // No hay resurrección: el estado eliminado es final.
    const eliminado = estado(0, 3);
    expect(aplicar(eliminado, { answered: true, correct: true })).toBe(eliminado);
  });

  it('las vidas no bajan de cero', () => {
    const next = aplicar(estado(1), { answered: true, correct: false });
    expect(next.lives).toBe(0);
  });
});

describe('recuperar vida por racha', () => {
  const config = { ...CONFIG, lives: 3, regainLifeOnStreak: 3 };

  it('devuelve una vida al completar la racha', () => {
    // streakBefore 2 + este acierto = 3.
    const next = aplicar(estado(2), { answered: true, correct: true }, { config, streakBefore: 2 });
    expect(next.lives).toBe(3);
  });

  it('no pasa del máximo con el que se empezó', () => {
    const next = aplicar(estado(3), { answered: true, correct: true }, { config, streakBefore: 2 });
    expect(next.lives).toBe(3);
  });

  it('no devuelve vida a mitad de racha', () => {
    const next = aplicar(estado(2), { answered: true, correct: true }, { config, streakBefore: 1 });
    expect(next.lives).toBe(2);
  });

  it('desactivado por defecto', () => {
    const next = aplicar(estado(2), { answered: true, correct: true }, { streakBefore: 2 });
    expect(next.lives).toBe(2);
  });
});

describe('clasificación y desempate', () => {
  function entrada(overrides: Partial<SurvivalStanding>): SurvivalStanding {
    return {
      participantId: 'p',
      lives: 1,
      eliminatedAtRound: null,
      eliminationOrder: null,
      score: 0,
      correctAnswers: 0,
      totalLatencyMs: 0,
      ...overrides,
    };
  }

  it('quien sigue en pie va por delante de cualquier eliminado', () => {
    const orden = sortStandings([
      entrada({ participantId: 'caido', eliminatedAtRound: 5, lives: 0, score: 9999 }),
      entrada({ participantId: 'vivo', lives: 1, score: 0 }),
    ]);
    expect(orden[0]!.participantId).toBe('vivo');
  });

  it('entre eliminados, gana quien aguantó más rondas', () => {
    const orden = sortStandings([
      entrada({ participantId: 'pronto', eliminatedAtRound: 1 }),
      entrada({ participantId: 'tarde', eliminatedAtRound: 7 }),
    ]);
    expect(orden.map((e) => e.participantId)).toEqual(['tarde', 'pronto']);
  });

  it('desempata por vidas, luego puntos, luego aciertos y luego tiempo', () => {
    // Cada pareja se diferencia solo en el criterio que toca.
    expect(
      sortStandings([
        entrada({ participantId: 'a', lives: 1 }),
        entrada({ participantId: 'b', lives: 2 }),
      ])[0]!.participantId,
    ).toBe('b');

    expect(
      sortStandings([
        entrada({ participantId: 'a', score: 10 }),
        entrada({ participantId: 'b', score: 20 }),
      ])[0]!.participantId,
    ).toBe('b');

    expect(
      sortStandings([
        entrada({ participantId: 'a', correctAnswers: 1 }),
        entrada({ participantId: 'b', correctAnswers: 4 }),
      ])[0]!.participantId,
    ).toBe('b');

    expect(
      sortStandings([
        entrada({ participantId: 'lento', totalLatencyMs: 9000 }),
        entrada({ participantId: 'rapido', totalLatencyMs: 1000 }),
      ])[0]!.participantId,
    ).toBe('rapido');
  });

  it('es determinista: dos ordenaciones dan el mismo resultado', () => {
    const entradas = [
      entrada({ participantId: 'a', lives: 2, score: 100, totalLatencyMs: 500 }),
      entrada({ participantId: 'b', lives: 2, score: 100, totalLatencyMs: 500 }),
      entrada({ participantId: 'c', lives: 1 }),
    ];
    expect(sortStandings(entradas).map((e) => e.participantId)).toEqual(
      sortStandings(entradas).map((e) => e.participantId),
    );
  });
});

describe('final de partida', () => {
  function vivo(id: string): SurvivalStanding {
    return {
      participantId: id,
      lives: 2,
      eliminatedAtRound: null,
      eliminationOrder: null,
      score: 0,
      correctAnswers: 0,
      totalLatencyMs: 0,
    };
  }
  function caido(id: string, round: number): SurvivalStanding {
    return { ...vivo(id), lives: 0, eliminatedAtRound: round };
  }

  it('acaba cuando queda una sola persona en pie', () => {
    expect(
      isSurvivalFinished({
        standings: [vivo('a'), caido('b', 2), caido('c', 3)],
        roundIndex: 4,
        totalRounds: 20,
        config: CONFIG,
      }),
    ).toBe(true);
  });

  it('acaba también si caen todos a la vez', () => {
    expect(
      isSurvivalFinished({
        standings: [caido('a', 3), caido('b', 3)],
        roundIndex: 4,
        totalRounds: 20,
        config: CONFIG,
      }),
    ).toBe(true);
  });

  it('no acaba mientras queden dos en pie', () => {
    expect(
      isSurvivalFinished({
        standings: [vivo('a'), vivo('b')],
        roundIndex: 4,
        totalRounds: 20,
        config: CONFIG,
      }),
    ).toBe(false);
  });

  it('no acaba en la ronda 1 por jugar en solitario', () => {
    // Con una sola persona no hay a quién sobrevivir: se juega hasta el final.
    expect(
      isSurvivalFinished({
        standings: [vivo('solo')],
        roundIndex: 1,
        totalRounds: 20,
        config: CONFIG,
      }),
    ).toBe(false);
  });

  it('acaba al agotar el límite de rondas del anfitrión', () => {
    const config = { ...CONFIG, maxRounds: 5 };
    expect(
      isSurvivalFinished({
        standings: [vivo('a'), vivo('b')],
        roundIndex: 5,
        totalRounds: 20,
        config,
      }),
    ).toBe(true);
  });

  it('acaba al agotar las canciones aunque no haya límite propio', () => {
    expect(
      isSurvivalFinished({
        standings: [vivo('a'), vivo('b')],
        roundIndex: 20,
        totalRounds: 20,
        config: CONFIG,
      }),
    ).toBe(true);
  });
});
