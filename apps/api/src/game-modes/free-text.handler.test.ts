import { describe, expect, it } from 'vitest';
import { defaultConfigForMode } from '@bingo/shared';
import { FreeTextHandler, toPublicFreeTextRound } from './free-text.handler';
import type { RoundTrack, ScoringSettings } from './game-mode-handler';

const handler = new FreeTextHandler();

const TRACK: RoundTrack = {
  id: '1',
  title: 'Titi Me Preguntó',
  artist: 'Bad Bunny feat. Alguien',
  previewUrl: '/1.wav',
  releaseYear: 2022,
  album: null,
};

const SCORING: ScoringSettings = {
  correctMarkPoints: 100,
  speedBonusMax: 50,
  streakBonusPoints: 50,
  linePoints: 500,
  bingoPoints: 1500,
  wrongMarkPenalty: -50,
  wrongClaimPenalty: -100,
};

function ronda(type: 'SONG_TITLE' | 'ARTIST' = 'SONG_TITLE') {
  return handler.createRound({
    roomId: 'sala-1',
    config: { ...defaultConfigForMode('FREE_TEXT'), questionTypes: [type] },
    index: 0,
    totalRounds: 5,
    track: TRACK,
    pool: [TRACK],
  });
}

async function evalua(input: string, type: 'SONG_TITLE' | 'ARTIST' = 'SONG_TITLE') {
  const round = await ronda(type);
  return handler.evaluateAnswer({
    roomId: 'sala-1',
    config: defaultConfigForMode('FREE_TEXT'),
    participantId: 'p1',
    round,
    answer: { text: input },
    latencyMs: 1000,
  });
}

describe('la solución no viaja antes del reveal', () => {
  it('la vista pública solo lleva tipo y enunciado', async () => {
    const round = await ronda();
    const publica = toPublicFreeTextRound(round);

    expect(Object.keys(publica).sort()).toEqual(['prompt', 'type']);
    expect(JSON.stringify(publica)).not.toContain('Titi Me Preguntó');
    expect(JSON.stringify(publica)).not.toContain('expected');
  });
});

describe('evaluación de títulos', () => {
  it('acepta el título exacto', async () => {
    const result = await evalua('Titi Me Preguntó');
    expect(result.correct).toBe(true);
    expect(result.matchType).toBe('EXACT');
  });

  it('acepta sin tildes ni mayúsculas', async () => {
    const result = await evalua('titi me pregunto');
    expect(result.correct).toBe(true);
    expect(result.matchType).toBe('NORMALIZED');
  });

  it('acepta una errata razonable', async () => {
    const result = await evalua('tit me pregunto');
    expect(result.correct).toBe(true);
    expect(result.matchType).toBe('FUZZY');
  });

  it('rechaza una respuesta claramente distinta', async () => {
    const result = await evalua('Despacito');
    expect(result.correct).toBe(false);
    expect(result.matchType).toBe('REJECTED');
  });

  it('rechaza la respuesta vacía', async () => {
    expect((await evalua('   ')).correct).toBe(false);
  });
});

describe('evaluación de artistas', () => {
  it('acepta el artista principal aunque la pista tenga colaboración', async () => {
    const result = await evalua('Bad Bunny', 'ARTIST');
    expect(result.correct).toBe(true);
  });

  it('no acepta al colaborador suelto', async () => {
    const result = await evalua('Alguien', 'ARTIST');
    expect(result.correct).toBe(false);
  });
});

describe('respeta el apagado del fuzzy', () => {
  it('con fuzzy desactivado, una errata deja de valer', async () => {
    const round = await ronda();
    const result = await handler.evaluateAnswer({
      roomId: 'sala-1',
      config: { ...defaultConfigForMode('FREE_TEXT'), fuzzyEnabled: false },
      participantId: 'p1',
      round,
      answer: { text: 'tit me pregunto' },
      latencyMs: 1000,
    });
    expect(result.correct).toBe(false);
  });
});

describe('puntuación', () => {
  const config = defaultConfigForMode('FREE_TEXT');
  const base = {
    config,
    participantId: 'p1',
    latencyMs: 0,
    windowMs: 25000,
    scoring: SCORING,
  };
  const acierto = {
    accepted: true,
    correct: true,
    normalizedInput: 'x',
    matchType: 'EXACT' as const,
  };

  it('premia acierto y velocidad', () => {
    const events = handler.calculateScore({ ...base, result: acierto, streak: 0 });
    expect(events.map((e) => e.type)).toEqual(['CORRECT_ANSWER', 'SPEED_BONUS']);
  });

  it('añade racha al tercer acierto seguido', () => {
    const events = handler.calculateScore({
      ...base,
      latencyMs: 25000,
      result: acierto,
      streak: 2,
    });
    expect(events.map((e) => e.type)).toEqual(['CORRECT_ANSWER', 'STREAK_BONUS']);
  });

  it('no resta por fallar', () => {
    // Escribir a ciegas ya es bastante castigo; penalizarlo desincentiva jugar.
    const events = handler.calculateScore({
      ...base,
      result: { accepted: false, correct: false, normalizedInput: '', matchType: 'REJECTED' },
      streak: 3,
    });
    expect(events).toEqual([]);
  });

  it('un acierto por errata puntúa igual que uno exacto', () => {
    const exacto = handler.calculateScore({ ...base, result: acierto, streak: 0 });
    const difuso = handler.calculateScore({
      ...base,
      result: { ...acierto, matchType: 'FUZZY', similarity: 0.93 },
      streak: 0,
    });
    expect(difuso).toEqual(exacto);
  });
});

describe('rotación de tipos', () => {
  it('alterna entre los tipos elegidos', async () => {
    const tipos = new Set<string>();
    for (let index = 0; index < 2; index++) {
      const round = await handler.createRound({
        roomId: 'sala-1',
        config: {
          ...defaultConfigForMode('FREE_TEXT'),
          questionTypes: ['SONG_TITLE', 'ARTIST'],
        },
        index,
        totalRounds: 2,
        track: TRACK,
        pool: [TRACK],
      });
      tipos.add(round.type);
    }
    expect(tipos.size).toBe(2);
  });
});
