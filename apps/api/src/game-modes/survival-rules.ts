import type { SurvivalConfig } from '@bingo/shared';

/**
 * Reglas de vidas de Supervivencia.
 *
 * Lógica pura: no toca la base de datos ni el reloj. Las vidas **no** son
 * puntos y nunca pasan por `ScoreEvent`; son un estado aparte que decide quién
 * sigue jugando.
 */

export type LifeState = {
  lives: number;
  /** Ronda en la que se quedó sin vidas. Nulo = sigue en juego. */
  eliminatedAtRound: number | null;
  /** Orden de eliminación, para la ceremonia. */
  eliminationOrder: number | null;
};

export type RoundOutcome = {
  /** Si respondió algo, correcto o no. */
  answered: boolean;
  correct: boolean;
};

export function initialLifeState(config: SurvivalConfig): LifeState {
  return { lives: config.lives, eliminatedAtRound: null, eliminationOrder: null };
}

export function isActive(state: LifeState): boolean {
  return state.eliminatedAtRound === null;
}

/**
 * Aplica el resultado de una ronda a las vidas de una persona.
 *
 * Devuelve un estado nuevo: no muta el anterior, para que el motor pueda
 * comparar antes y después sin llevar la cuenta a mano.
 */
export function applyRoundOutcome(args: {
  state: LifeState;
  outcome: RoundOutcome;
  config: SurvivalConfig;
  roundIndex: number;
  /** Aciertos encadenados **antes** de esta ronda. */
  streakBefore: number;
  /** Cuántas personas llevan eliminadas, para asignar el orden. */
  eliminatedSoFar: number;
}): LifeState {
  const { state, outcome, config, roundIndex, streakBefore, eliminatedSoFar } = args;

  // Quien ya está eliminado no vuelve: es espectador hasta el final.
  if (!isActive(state)) return state;

  const falla = !outcome.correct;
  // No responder cuesta vida o no según lo decida el anfitrión; hay grupos
  // donde quedarse callado por dudar no debería costar lo mismo que fallar.
  const pierdeVida = outcome.answered ? falla : config.loseLifeOnNoAnswer;

  let lives = state.lives;
  if (pierdeVida) {
    lives -= 1;
  } else if (outcome.correct && config.regainLifeOnStreak !== null) {
    // Recuperar vida por racha: solo al completar exactamente el múltiplo, y
    // sin pasar del máximo con el que se empezó.
    const streak = streakBefore + 1;
    if (streak > 0 && streak % config.regainLifeOnStreak === 0 && lives < config.lives) {
      lives += 1;
    }
  }

  if (lives <= 0) {
    return {
      lives: 0,
      eliminatedAtRound: roundIndex,
      eliminationOrder: eliminatedSoFar + 1,
    };
  }

  return { ...state, lives };
}

export type SurvivalStanding = {
  participantId: string;
  lives: number;
  eliminatedAtRound: number | null;
  eliminationOrder: number | null;
  score: number;
  correctAnswers: number;
  /** Tiempo acumulado de respuesta, para desempatar. */
  totalLatencyMs: number;
};

/**
 * Ordena la clasificación de Supervivencia.
 *
 * El desempate es determinista y en este orden: más vidas, más puntuación,
 * más aciertos y menor tiempo acumulado. Sin la última regla, dos personas con
 * la misma partida quedarían empatadas y el orden dependería del azar.
 */
export function sortStandings(standings: readonly SurvivalStanding[]): SurvivalStanding[] {
  return [...standings].sort((a, b) => {
    const activoA = a.eliminatedAtRound === null;
    const activoB = b.eliminatedAtRound === null;
    // Quien sigue en pie va por delante de cualquiera que haya caído.
    if (activoA !== activoB) return activoA ? -1 : 1;

    // Entre eliminados, gana quien aguantó más rondas.
    if (!activoA && !activoB && a.eliminatedAtRound !== b.eliminatedAtRound) {
      return (b.eliminatedAtRound ?? 0) - (a.eliminatedAtRound ?? 0);
    }

    if (a.lives !== b.lives) return b.lives - a.lives;
    if (a.score !== b.score) return b.score - a.score;
    if (a.correctAnswers !== b.correctAnswers) return b.correctAnswers - a.correctAnswers;
    return a.totalLatencyMs - b.totalLatencyMs;
  });
}

/**
 * Si la partida ha terminado por las reglas del modo.
 *
 * Termina cuando queda una sola persona en pie, o ninguna —puede pasar si la
 * última ronda elimina a las dos que quedaban—, o al agotar el límite de
 * rondas que fijara el anfitrión.
 */
export function isSurvivalFinished(args: {
  standings: readonly SurvivalStanding[];
  roundIndex: number;
  totalRounds: number;
  config: SurvivalConfig;
}): boolean {
  const { standings, roundIndex, totalRounds, config } = args;
  const activos = standings.filter((s) => s.eliminatedAtRound === null);

  // Con una sola persona en la sala no tiene sentido acabar en la ronda 1.
  if (standings.length > 1 && activos.length <= 1) return true;

  const limite = config.maxRounds === null ? totalRounds : Math.min(config.maxRounds, totalRounds);
  return roundIndex >= limite;
}
