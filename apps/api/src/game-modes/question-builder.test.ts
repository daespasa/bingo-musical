import { describe, expect, it } from 'vitest';
import { createRng } from '@bingo/shared';
import { buildQuizQuestion, decadeOf, supportedQuestionTypes } from './question-builder';
import type { RoundTrack } from './game-mode-handler';

function track(
  id: string,
  title: string,
  artist: string,
  releaseYear: number | null = null,
  album: string | null = null,
): RoundTrack {
  return { id, title, artist, previewUrl: `/${id}.wav`, releaseYear, album };
}

const POOL: RoundTrack[] = [
  track('1', 'Neon Nights', 'The Demo Waves', 1983),
  track('2', 'Luna de Verano', 'Los Sintéticos', 1986),
  track('3', 'Midnight Circuit', 'Pixel Orchestra', 1994),
  track('4', 'Golden Frequency', 'Analog Dreams', 1991),
  track('5', 'Silver Echoes', 'Pixel Orchestra', 2003),
  track('6', 'Ruta 404', 'Cohete 9', 2007),
  track('7', 'Ciudad Neón', 'Aurora Beat', 2011),
  track('8', 'Salto Cuántico', 'Cohete 9', 2023),
];

const rng = () => createRng('test');

// Pool con dos pistas homónimas de artistas distintos, para las pruebas de
// subtítulo: la deduplicación de distractores es por texto, así que ambas no
// pueden aparecer nunca a la vez como opciones.
const POOL_HOMONIMOS: RoundTrack[] = [
  track('h1', 'Corazón de Neón', 'Artista Uno', 1985, 'Álbum Uno'),
  track('h2', 'Bajo la Lluvia', 'Artista Dos', 1990, 'Álbum Dos'),
  track('h3', 'Corazón de Neón', 'Artista Tres', 1998),
  track('h4', 'Estrella Fugaz', 'Artista Cuatro', 2005),
  track('h5', 'Voces del Viento', 'Artista Cinco', 2012),
];

describe('décadas', () => {
  it('agrupa el año en su década', () => {
    expect(decadeOf(1983)).toBe('1980s');
    expect(decadeOf(1990)).toBe('1990s');
    expect(decadeOf(2009)).toBe('2000s');
    expect(decadeOf(2023)).toBe('2020s');
  });
});

describe('tipos que la colección puede sostener', () => {
  it('acepta título y artista con cualquier colección variada', () => {
    expect(supportedQuestionTypes(POOL, ['SONG_TITLE', 'ARTIST'])).toEqual([
      'SONG_TITLE',
      'ARTIST',
    ]);
  });

  it('descarta década cuando no hay años', () => {
    const sinAnios = POOL.map((t) => ({ ...t, releaseYear: null }));
    expect(supportedQuestionTypes(sinAnios, ['DECADE', 'SONG_TITLE'])).toEqual(['SONG_TITLE']);
  });

  it('descarta álbum cuando la colección no lo trae', () => {
    expect(supportedQuestionTypes(POOL, ['ALBUM'])).toEqual([]);
  });

  it('descarta un tipo cuya respuesta es siempre la misma', () => {
    // Con un solo artista no hay distractor posible: la pregunta se contesta
    // sola y no debería llegar a plantearse.
    const unSoloArtista = POOL.map((t) => ({ ...t, artist: 'Único' }));
    expect(supportedQuestionTypes(unSoloArtista, ['ARTIST'])).toEqual([]);
  });
});

describe('construcción de la pregunta', () => {
  it('incluye la respuesta correcta exactamente una vez', () => {
    const q = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL[0]!,
      pool: POOL,
      optionCount: 4,
      rng: rng(),
    })!;

    expect(q.correctText).toBe('Neon Nights');
    expect(q.options.filter((o) => o.text === 'Neon Nights')).toHaveLength(1);
  });

  it('respeta el número de opciones pedido', () => {
    for (const optionCount of [2, 3, 4]) {
      const q = buildQuizQuestion({
        type: 'SONG_TITLE',
        track: POOL[0]!,
        pool: POOL,
        optionCount,
        rng: rng(),
      })!;
      expect(q.options).toHaveLength(optionCount);
    }
  });

  it('no repite opciones', () => {
    const q = buildQuizQuestion({
      type: 'ARTIST',
      track: POOL[4]!,
      pool: POOL,
      optionCount: 4,
      rng: rng(),
    })!;
    expect(new Set(q.options.map((o) => o.text)).size).toBe(q.options.length);
  });

  it('saca los distractores de la propia colección', () => {
    const q = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL[0]!,
      pool: POOL,
      optionCount: 4,
      rng: rng(),
    })!;
    const titulos = new Set(POOL.map((t) => t.title));
    for (const option of q.options) expect(titulos.has(option.text)).toBe(true);
  });

  it('no propone como distractor otro tema del mismo artista al preguntar artista', () => {
    // Cohete 9 aparece dos veces en la colección: su nombre no puede salir
    // como distractor de sí mismo.
    const q = buildQuizQuestion({
      type: 'ARTIST',
      track: POOL[5]!,
      pool: POOL,
      optionCount: 4,
      rng: rng(),
    })!;
    expect(q.options.filter((o) => o.text === 'Cohete 9')).toHaveLength(1);
  });

  it('propone décadas creíbles, no disparates', () => {
    const q = buildQuizQuestion({
      type: 'DECADE',
      track: POOL[0]!,
      pool: POOL,
      optionCount: 4,
      rng: rng(),
    })!;

    expect(q.correctText).toBe('1980s');
    for (const option of q.options) {
      expect(option.text).toMatch(/^(19[5-9]0|20[0-3]0)s$/);
    }
  });

  it('rellena con décadas vecinas si la colección es pequeña', () => {
    const pequeña = [track('a', 'A', 'X', 1983), track('b', 'B', 'Y', 1986)];
    const q = buildQuizQuestion({
      type: 'DECADE',
      track: pequeña[0]!,
      pool: pequeña,
      optionCount: 3,
      rng: rng(),
    })!;

    // Ambas son de los 80: sin relleno solo habría una opción.
    expect(q.options).toHaveLength(3);
    expect(q.options.map((o) => o.text)).toContain('1980s');
  });

  it('devuelve null cuando la pista no puede sostener el tipo', () => {
    const sinAnio = track('z', 'Z', 'W', null);
    expect(
      buildQuizQuestion({
        type: 'DECADE',
        track: sinAnio,
        pool: [sinAnio],
        optionCount: 4,
        rng: rng(),
      }),
    ).toBeNull();
  });

  it('devuelve null si no hay ningún distractor posible', () => {
    const solo = [track('a', 'Igual', 'X'), track('b', 'Igual', 'Y')];
    expect(
      buildQuizQuestion({
        type: 'SONG_TITLE',
        track: solo[0]!,
        pool: solo,
        optionCount: 4,
        rng: rng(),
      }),
    ).toBeNull();
  });

  it('es determinista con la misma semilla', () => {
    const a = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL[2]!,
      pool: POOL,
      optionCount: 4,
      rng: createRng('ronda:3'),
    })!;
    const b = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL[2]!,
      pool: POOL,
      optionCount: 4,
      rng: createRng('ronda:3'),
    })!;

    // Si no lo fuera, quien reconecta vería otras opciones que el resto.
    expect(a.options).toEqual(b.options);
  });

  it('redacta un enunciado propio para cada tipo', () => {
    const tipos = ['SONG_TITLE', 'ARTIST', 'DECADE'] as const;
    const prompts = tipos.map(
      (type) =>
        buildQuizQuestion({ type, track: POOL[0]!, pool: POOL, optionCount: 3, rng: rng() })!
          .prompt,
    );
    expect(new Set(prompts).size).toBe(3);
  });
});

describe('subtítulo de las opciones', () => {
  it('en SONG_TITLE cada opción trae el artista de SU canción, no el de la que suena', () => {
    const draft = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL_HOMONIMOS[0]!,
      pool: POOL_HOMONIMOS,
      optionCount: 4,
      rng: createRng('semilla'),
    })!;

    for (const option of draft.options) {
      const suya = POOL_HOMONIMOS.find((t) => t.title === option.text)!;
      expect(option.subtitle).toBe(suya.artist);
    }
  });

  // Los cuatro tipos que NO son SONG_TITLE: ninguno debe llevar subtítulo.
  // Cubrir los cuatro (y no solo un par) es lo que cierra el invariante de
  // seguridad; un futuro `type === 'SONG_TITLE' || type === 'ALBUM'` se
  // colaría con la suite en verde si faltara cualquiera de ellos.
  it.each(['ARTIST', 'ALBUM', 'RELEASE_YEAR', 'DECADE'] as const)(
    'en %s no hay subtítulo: sería regalar la respuesta o no aportar nada',
    (type) => {
      const draft = buildQuizQuestion({
        type,
        track: POOL_HOMONIMOS[0]!,
        pool: POOL_HOMONIMOS,
        optionCount: 4,
        rng: createRng('semilla'),
      })!;
      expect(draft.options.every((o) => o.subtitle === null)).toBe(true);
    },
  );

  it('la misma semilla da el mismo orden y los mismos pares título/artista', () => {
    const uno = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL_HOMONIMOS[0]!,
      pool: POOL_HOMONIMOS,
      optionCount: 4,
      rng: createRng('misma'),
    })!;
    const dos = buildQuizQuestion({
      type: 'SONG_TITLE',
      track: POOL_HOMONIMOS[0]!,
      pool: POOL_HOMONIMOS,
      optionCount: 4,
      rng: createRng('misma'),
    })!;
    expect(dos.options).toEqual(uno.options);
  });
});
