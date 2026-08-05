/** Valores de puntuación por defecto (configurables por partida). */
export const DEFAULT_SCORING = {
  correctMarkPoints: 100,
  speedBonusMax: 50,
  streakBonusPoints: 50,
  streakLength: 3,
  linePoints: 500,
  bingoPoints: 1500,
  wrongMarkPenalty: -50,
  wrongClaimPenalty: -100,
} as const;

export type ScoringConfig = {
  correctMarkPoints: number;
  speedBonusMax: number;
  streakBonusPoints: number;
  linePoints: number;
  bingoPoints: number;
  wrongMarkPenalty: number;
  wrongClaimPenalty: number;
};

/**
 * Bonus por velocidad: lineal desde el máximo (respuesta inmediata)
 * hasta 0 al agotarse la ventana.
 */
export function computeSpeedBonus(latencyMs: number, windowMs: number, maxBonus: number): number {
  if (windowMs <= 0 || latencyMs <= 0) return maxBonus;
  if (latencyMs >= windowMs) return 0;
  return Math.round(maxBonus * (1 - latencyMs / windowMs));
}
