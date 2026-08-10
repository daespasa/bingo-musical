import { describe, expect, it } from 'vitest';
import { defaultConfigForMode, type MixedConfig } from '@bingo/shared';
import { buildMixedPlan, distributionFor, roundDefinitionAt, MIXED_PRESETS } from './mixed-plan';

const EQUILIBRADO = defaultConfigForMode('MIXED');

function conPreset(preset: MixedConfig['preset']): MixedConfig {
  return { ...EQUILIBRADO, preset };
}

describe('repartos predefinidos', () => {
  it('el equilibrado suma 100 y mezcla los dos tipos de ronda', () => {
    const reparto = MIXED_PRESETS.EQUILIBRADO;
    expect(reparto.reduce((sum, e) => sum + e.weight, 0)).toBe(100);
    expect(new Set(reparto.map((e) => e.kind))).toEqual(new Set(['MULTIPLE_CHOICE', 'FREE_TEXT']));
  });

  it('solo reconocimiento no usa opciones', () => {
    expect(MIXED_PRESETS.SOLO_RECONOCIMIENTO.every((e) => e.kind === 'FREE_TEXT')).toBe(true);
  });

  it('personalizado usa el reparto guardado en la configuración', () => {
    const config: MixedConfig = {
      ...EQUILIBRADO,
      preset: 'PERSONALIZADO',
      distribution: [{ kind: 'FREE_TEXT', questionType: 'ARTIST', weight: 100 }],
    };
    expect(distributionFor(config)).toEqual(config.distribution);
  });
});

describe('plan de rondas', () => {
  it('genera exactamente tantas rondas como se piden', () => {
    for (const total of [1, 2, 5, 7, 10, 20, 37]) {
      expect(buildMixedPlan(EQUILIBRADO, total)).toHaveLength(total);
    }
  });

  it('reparte según los pesos en una partida larga', () => {
    const plan = buildMixedPlan(EQUILIBRADO, 100);
    const conOpciones = plan.filter((e) => e.kind === 'MULTIPLE_CHOICE').length;
    // 30 + 20 + 20 = 70 % con opciones.
    expect(conOpciones).toBe(70);
  });

  it('no deja fuera un tipo con peso solo por redondear hacia abajo', () => {
    // Con 5 rondas, el 10 % del artista libre daría 0,5: el reparto por resto
    // mayor evita que ese tipo desaparezca del todo en partidas cortas.
    const plan = buildMixedPlan(EQUILIBRADO, 5);
    expect(plan).toHaveLength(5);
    expect(new Set(plan.map((e) => e.kind)).size).toBe(2);
  });

  it('la variedad aparece pronto, no al final de la partida', () => {
    // Con el reparto equilibrado hay tres entradas con opciones y solo dos de
    // escribir. Si se eligiera siempre la de más rondas pendientes, las
    // primeras rondas serían todas de opciones y el modo no se notaría hasta
    // la mitad de la partida.
    const plan = buildMixedPlan(EQUILIBRADO, 20);
    const primeraLibre = plan.findIndex((e) => e.kind === 'FREE_TEXT');
    expect(primeraLibre).toBeGreaterThanOrEqual(0);
    expect(primeraLibre).toBeLessThan(4);
  });

  it('intercala en vez de agrupar', () => {
    const plan = buildMixedPlan(EQUILIBRADO, 10);
    // Sin intercalar saldrían siete de opciones seguidas y luego tres de
    // escribir, que es justo lo que el modo mixto viene a evitar.
    const maxSeguidas = plan.reduce(
      (acc, entry) => {
        const seguidas = entry.kind === acc.ultimo ? acc.actual + 1 : 1;
        return { ultimo: entry.kind, actual: seguidas, max: Math.max(acc.max, seguidas) };
      },
      { ultimo: '', actual: 0, max: 0 },
    ).max;
    expect(maxSeguidas).toBeLessThan(7);
  });

  it('es determinista', () => {
    // Quien reconecta tiene que recibir la misma ronda que el resto.
    expect(buildMixedPlan(EQUILIBRADO, 13)).toEqual(buildMixedPlan(EQUILIBRADO, 13));
  });

  it('con solo reconocimiento, todas las rondas son de escribir', () => {
    const plan = buildMixedPlan(conPreset('SOLO_RECONOCIMIENTO'), 12);
    expect(plan.every((e) => e.kind === 'FREE_TEXT')).toBe(true);
  });

  it('devuelve un plan vacío si no hay rondas', () => {
    expect(buildMixedPlan(EQUILIBRADO, 0)).toEqual([]);
  });

  it('ignora los tipos con peso cero', () => {
    const config: MixedConfig = {
      ...EQUILIBRADO,
      preset: 'PERSONALIZADO',
      distribution: [
        { kind: 'MULTIPLE_CHOICE', questionType: 'SONG_TITLE', weight: 100 },
        { kind: 'FREE_TEXT', questionType: 'ARTIST', weight: 1 },
      ],
    };
    const plan = buildMixedPlan(config, 10);
    expect(plan.filter((e) => e.kind === 'MULTIPLE_CHOICE').length).toBeGreaterThan(8);
  });
});

describe('ronda concreta', () => {
  it('devuelve la definición de cada índice', () => {
    const plan = buildMixedPlan(EQUILIBRADO, 10);
    expect(roundDefinitionAt(plan, 0)).toEqual(plan[0]);
    expect(roundDefinitionAt(plan, 9)).toEqual(plan[9]);
  });

  it('recorre en ciclo si la partida tiene más rondas que el plan', () => {
    // No debería pasar, pero es mejor repetir mezcla que reventar a mitad.
    const plan = buildMixedPlan(EQUILIBRADO, 4);
    expect(roundDefinitionAt(plan, 5)).toEqual(plan[1]);
  });

  it('devuelve null con el plan vacío', () => {
    expect(roundDefinitionAt([], 0)).toBeNull();
  });
});
