import { describe, expect, it } from 'vitest';
import { defaultConfigForMode } from '@bingo/shared';
import {
  MultipleChoiceHandler,
  pickPopularDistractor,
  toPublicQuizRound,
  type QuizOption,
} from './multiple-choice.handler';
import type { RoundTrack } from './game-mode-handler';
import type { ScoringSettings } from './game-mode-handler';

const handler = new MultipleChoiceHandler();

const POOL: RoundTrack[] = [
  {
    id: '1',
    title: 'Neon Nights',
    artist: 'The Demo Waves',
    previewUrl: '/1.wav',
    releaseYear: 1983,
    album: null,
  },
  {
    id: '2',
    title: 'Luna de Verano',
    artist: 'Los Sintéticos',
    previewUrl: '/2.wav',
    releaseYear: 1994,
    album: null,
  },
  {
    id: '3',
    title: 'Ruta 404',
    artist: 'Cohete 9',
    previewUrl: '/3.wav',
    releaseYear: 2007,
    album: null,
  },
  {
    id: '4',
    title: 'Ciudad Neón',
    artist: 'Aurora Beat',
    previewUrl: '/4.wav',
    releaseYear: 2015,
    album: null,
  },
];

const SCORING: ScoringSettings = {
  correctMarkPoints: 100,
  speedBonusMax: 50,
  streakBonusPoints: 50,
  linePoints: 500,
  bingoPoints: 1500,
  wrongMarkPenalty: -50,
  wrongClaimPenalty: -100,
};

function crearRonda(overrides: Partial<{ index: number; questionTypes: string[] }> = {}) {
  const config = {
    ...defaultConfigForMode('MULTIPLE_CHOICE'),
    ...(overrides.questionTypes ? { questionTypes: overrides.questionTypes as never } : {}),
  };
  return handler.createRound({
    roomId: 'sala-1',
    config,
    index: overrides.index ?? 0,
    totalRounds: 10,
    track: POOL[0]!,
    pool: POOL,
  });
}

describe('rondas de quiz', () => {
  it('construye una pregunta con la respuesta correcta señalada', async () => {
    const round = await crearRonda();
    expect(round.options[round.correctIndex]?.text).toBe(round.correctText);
  });

  it('alterna los tipos de pregunta entre rondas', async () => {
    const tipos = new Set<string>();
    for (let index = 0; index < 3; index++) {
      const round = await handler.createRound({
        roomId: 'sala-1',
        config: {
          ...defaultConfigForMode('MULTIPLE_CHOICE'),
          questionTypes: ['SONG_TITLE', 'ARTIST', 'DECADE'],
        },
        index,
        totalRounds: 3,
        track: POOL[0]!,
        pool: POOL,
      });
      tipos.add(round.type);
    }
    // Con tres tipos pedidos y tres rondas, deben salir los tres.
    expect(tipos.size).toBe(3);
  });

  it('cae a título cuando la colección no sostiene el tipo pedido', async () => {
    const sinAnios = POOL.map((t) => ({ ...t, releaseYear: null }));
    const round = await handler.createRound({
      roomId: 'sala-1',
      config: { ...defaultConfigForMode('MULTIPLE_CHOICE'), questionTypes: ['DECADE'] },
      index: 0,
      totalRounds: 5,
      track: sinAnios[0]!,
      pool: sinAnios,
    });
    expect(round.type).toBe('SONG_TITLE');
  });
});

describe('la solución no viaja antes del reveal', () => {
  it('la vista pública no lleva la respuesta correcta', async () => {
    const round = await crearRonda();
    const publica = toPublicQuizRound(round);

    // Ni el índice, ni el texto, ni ninguna marca de cuál es.
    expect(publica).not.toHaveProperty('correctIndex');
    expect(publica).not.toHaveProperty('correctText');
    expect(Object.keys(publica).sort()).toEqual(['options', 'prompt', 'type']);
  });

  it('serializada tampoco delata cuál es la correcta', async () => {
    const round = await crearRonda();
    const json = JSON.parse(JSON.stringify(toPublicQuizRound(round))) as Record<string, unknown>;

    // El texto correcto aparece como una opción más, indistinguible del resto.
    expect(JSON.stringify(json)).not.toContain('correctIndex');
    expect(JSON.stringify(json)).not.toContain('correctText');
    expect(JSON.stringify(json)).not.toContain('isCorrect');
  });

  it('la vista pública lleva los subtítulos y sigue sin decir cuál es la correcta', async () => {
    const round = await crearRonda();
    const publica = toPublicQuizRound(round) as Record<string, unknown>;

    expect(publica.options).toEqual(round.options);
    expect(publica).not.toHaveProperty('correctText');
    expect(publica).not.toHaveProperty('correctIndex');
  });

  it('las opciones no van ordenadas con la correcta siempre primero', async () => {
    // Si la correcta cayera siempre en la misma posición, el orden sería la
    // filtración.
    const posiciones = new Set<number>();
    for (let index = 0; index < 8; index++) {
      const round = await handler.createRound({
        roomId: `sala-${index}`,
        config: defaultConfigForMode('MULTIPLE_CHOICE'),
        index,
        totalRounds: 8,
        track: POOL[index % POOL.length]!,
        pool: POOL,
      });
      posiciones.add(round.correctIndex);
    }
    expect(posiciones.size).toBeGreaterThan(1);
  });
});

describe('evaluación', () => {
  it('acierta solo con el índice correcto', async () => {
    const round = await crearRonda();
    const base = {
      roomId: 'sala-1',
      config: defaultConfigForMode('MULTIPLE_CHOICE'),
      participantId: 'p1',
      round,
      latencyMs: 500,
    };

    expect(
      (await handler.evaluateAnswer({ ...base, answer: { optionIndex: round.correctIndex } }))
        .correct,
    ).toBe(true);

    const otro = (round.correctIndex + 1) % round.options.length;
    expect((await handler.evaluateAnswer({ ...base, answer: { optionIndex: otro } })).correct).toBe(
      false,
    );
  });
});

describe('puntuación', () => {
  const config = defaultConfigForMode('MULTIPLE_CHOICE');

  it('premia acierto y velocidad', () => {
    const events = handler.calculateScore({
      config,
      participantId: 'p1',
      result: { correct: true },
      latencyMs: 0,
      streak: 0,
      windowMs: 25000,
      scoring: SCORING,
    });
    expect(events.map((e) => e.type)).toEqual(['CORRECT_ANSWER', 'SPEED_BONUS']);
  });

  it('añade racha al tercer acierto seguido', () => {
    const events = handler.calculateScore({
      config,
      participantId: 'p1',
      result: { correct: true },
      latencyMs: 25000,
      streak: 2,
      windowMs: 25000,
      scoring: SCORING,
    });
    expect(events.map((e) => e.type)).toEqual(['CORRECT_ANSWER', 'STREAK_BONUS']);
  });

  it('por defecto fallar no resta', () => {
    // Castigar el intento desincentiva jugar; la penalización es opcional.
    const events = handler.calculateScore({
      config,
      participantId: 'p1',
      result: { correct: false },
      latencyMs: 500,
      streak: 3,
      windowMs: 25000,
      scoring: SCORING,
    });
    expect(events).toEqual([]);
  });

  it('resta si el anfitrión configuró penalización', () => {
    const events = handler.calculateScore({
      config: { ...config, wrongAnswerPenalty: -25 },
      participantId: 'p1',
      result: { correct: false },
      latencyMs: 500,
      streak: 0,
      windowMs: 25000,
      scoring: SCORING,
    });
    expect(events).toEqual([{ type: 'WRONG_ANSWER', points: -25 }]);
  });
});

describe('el distractor más popular', () => {
  const options: QuizOption[] = [
    { text: 'La Vieja Radio', subtitle: 'Los Sintéticos' },
    { text: 'Neon Nights', subtitle: 'The Demo Waves' },
    { text: 'Ruta 404', subtitle: 'Cohete 9' },
  ];

  it('devuelve el texto de la opción, no el objeto entero', () => {
    // Reproduce el fallo de la Tarea 4: si el highlight guardara la opción
    // completa en vez de leer `option.text`, `data.text` sería un objeto y
    // se habría serializado como "[object Object]" en el resumen.
    const distractor = pickPopularDistractor(options, 2, [3, 1, 2], 1);
    expect(distractor).toEqual({ text: 'La Vieja Radio', count: 3 });
    expect(typeof distractor?.text).toBe('string');
  });

  it('ignora la opción correcta aunque sea la más votada', () => {
    // El índice 1 (el correcto) es el que más votos tiene; el distractor
    // debe salir del resto de opciones, no de ese.
    const distractor = pickPopularDistractor(options, 1, [1, 5, 3], 0);
    expect(distractor).toEqual({ text: 'Ruta 404', count: 3 });
  });

  it('no destaca nada si el distractor no ha engañado a suficiente gente', () => {
    expect(pickPopularDistractor(options, 1, [1, 4, 0], 1)).toBeNull();
    expect(pickPopularDistractor(options, 1, [0, 4, 0], 1)).toBeNull();
  });
});
