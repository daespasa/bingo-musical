import type { MixedConfig, MixedRoundDefinition } from '@bingo/shared';

/**
 * Reparto de rondas del modo mixto.
 *
 * Lógica pura y determinista: la misma configuración y el mismo número de
 * rondas producen siempre el mismo plan. Hace falta que lo sea porque el plan
 * se consulta en cada ronda y quien reconecta tiene que recibir la misma.
 */

/** Presets que ofrece el anfitrión, con su reparto. */
export const MIXED_PRESETS: Record<
  Exclude<MixedConfig['preset'], 'PERSONALIZADO'>,
  MixedRoundDefinition[]
> = {
  // Un poco de todo: opciones para entrar, respuesta libre para exigir.
  EQUILIBRADO: [
    { kind: 'MULTIPLE_CHOICE', questionType: 'SONG_TITLE', weight: 30 },
    { kind: 'MULTIPLE_CHOICE', questionType: 'ARTIST', weight: 20 },
    { kind: 'MULTIPLE_CHOICE', questionType: 'DECADE', weight: 20 },
    { kind: 'FREE_TEXT', questionType: 'SONG_TITLE', weight: 20 },
    { kind: 'FREE_TEXT', questionType: 'ARTIST', weight: 10 },
  ],
  // Todo a reconocer de oído, sin opciones que ayuden.
  SOLO_RECONOCIMIENTO: [
    { kind: 'FREE_TEXT', questionType: 'SONG_TITLE', weight: 60 },
    { kind: 'FREE_TEXT', questionType: 'ARTIST', weight: 40 },
  ],
};

/** El reparto efectivo de una configuración, resolviendo el preset. */
export function distributionFor(config: MixedConfig): MixedRoundDefinition[] {
  if (config.preset === 'PERSONALIZADO') return [...config.distribution];
  return [...MIXED_PRESETS[config.preset]];
}

/**
 * Convierte el reparto en un plan concreto de rondas.
 *
 * Reparte por el método del resto mayor: primero la parte entera que a cada
 * tipo le corresponde por peso, y las rondas sobrantes van a los tipos con
 * mayor resto. Así, con pocas rondas, ningún tipo con peso se queda fuera por
 * redondeo hacia abajo.
 *
 * Luego intercala: sin intercalar, el reparto saldría agrupado —cinco de
 * opciones seguidas y luego cinco de escribir—, que es justo lo que el modo
 * mixto viene a evitar.
 */
export function buildMixedPlan(config: MixedConfig, totalRounds: number): MixedRoundDefinition[] {
  const distribution = distributionFor(config).filter((entry) => entry.weight > 0);
  if (distribution.length === 0 || totalRounds <= 0) return [];

  const pesoTotal = distribution.reduce((sum, entry) => sum + entry.weight, 0);

  const cuotas = distribution.map((entry) => {
    const exacto = (entry.weight / pesoTotal) * totalRounds;
    const entera = Math.floor(exacto);
    return { entry, entera, resto: exacto - entera };
  });

  let asignadas = cuotas.reduce((sum, cuota) => sum + cuota.entera, 0);
  // Las sobrantes, a los mayores restos. El desempate por peso y luego por
  // posición mantiene el resultado determinista.
  const porResto = [...cuotas].sort((a, b) => b.resto - a.resto || b.entry.weight - a.entry.weight);
  let i = 0;
  while (asignadas < totalRounds) {
    porResto[i % porResto.length]!.entera += 1;
    asignadas += 1;
    i += 1;
  }

  /*
   * Intercalado proporcional.
   *
   * En cada paso se elige el tipo que "más atrasado" va respecto a su cuota,
   * medido como (usadas + 0,5) / cuota. Eso reparte cada tipo de forma
   * uniforme a lo largo de la partida.
   *
   * La versión anterior tomaba simplemente el tipo con más rondas pendientes,
   * y como el reparto equilibrado tiene tres entradas con opciones y solo dos
   * de escribir, las primeras rondas salían todas de opciones. Lo destapó un
   * E2E que recorría cuatro rondas y solo encontraba un tipo.
   */
  const pendientes = cuotas
    .filter((cuota) => cuota.entera > 0)
    .map((cuota) => ({ entry: cuota.entry, cuota: cuota.entera, usadas: 0 }));

  const plan: MixedRoundDefinition[] = [];
  while (plan.length < totalRounds) {
    let elegido: (typeof pendientes)[number] | null = null;
    let mejorClave = Infinity;
    for (const candidato of pendientes) {
      if (candidato.usadas >= candidato.cuota) continue;
      const clave = (candidato.usadas + 0.5) / candidato.cuota;
      if (clave < mejorClave) {
        mejorClave = clave;
        elegido = candidato;
      }
    }
    if (!elegido) break;
    plan.push(elegido.entry);
    elegido.usadas += 1;
  }

  return plan;
}

/**
 * Qué toca en una ronda concreta.
 *
 * Si el plan es más corto que la partida —no debería, pero una colección puede
 * traer más pistas de las previstas— se recorre en ciclo en lugar de fallar.
 */
export function roundDefinitionAt(
  plan: readonly MixedRoundDefinition[],
  index: number,
): MixedRoundDefinition | null {
  if (plan.length === 0) return null;
  return plan[index % plan.length]!;
}
