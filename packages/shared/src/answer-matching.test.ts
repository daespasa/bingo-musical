import { describe, expect, it } from 'vitest';
import {
  damerauLevenshtein,
  evaluateAnswer,
  fuzzyToleranceFor,
  normalizeAnswer,
  primaryArtist,
} from './answer-matching';

/** Atajo: ¿se acepta esta respuesta para este título? */
function aceptaTitulo(input: string, expected: string): boolean {
  return evaluateAnswer(input, { text: expected, kind: 'TITLE' }).accepted;
}

function aceptaArtista(input: string, expected: string): boolean {
  return evaluateAnswer(input, { text: expected, kind: 'ARTIST' }).accepted;
}

describe('normalización', () => {
  it('ignora mayúsculas y acentos', () => {
    expect(normalizeAnswer('Corazón Partío')).toBe('corazon partio');
    expect(normalizeAnswer('CORAZON partio')).toBe('corazon partio');
  });

  it('ignora la puntuación', () => {
    expect(normalizeAnswer('¿Quién será?')).toBe('quien sera');
    expect(normalizeAnswer('Hey, Jude!')).toBe('hey jude');
  });

  it('colapsa espacios repetidos', () => {
    expect(normalizeAnswer('  la    bachata  ')).toBe('la bachata');
  });

  it('quita apóstrofes sin dejar hueco', () => {
    expect(normalizeAnswer("Rock'n'Roll")).toBe('rocknroll');
    expect(normalizeAnswer('Rock’n’Roll')).toBe('rocknroll');
  });

  it('trata los guiones como separadores', () => {
    expect(normalizeAnswer('Spider-Man')).toBe('spider man');
  });

  it('unifica &, and e y', () => {
    expect(normalizeAnswer('Simon & Garfunkel')).toBe('simon y garfunkel');
    expect(normalizeAnswer('Simon and Garfunkel')).toBe('simon y garfunkel');
    expect(normalizeAnswer('Simon y Garfunkel')).toBe('simon y garfunkel');
  });
});

describe('sufijos técnicos', () => {
  it('ignora remaster y remastered', () => {
    expect(aceptaTitulo('Imagine', 'Imagine - Remastered 2010')).toBe(true);
    expect(aceptaTitulo('Imagine', 'Imagine (Remaster)')).toBe(true);
  });

  it('ignora radio edit y versiones', () => {
    expect(aceptaTitulo('Insomnia', 'Insomnia - Radio Edit')).toBe(true);
    expect(aceptaTitulo('Otherside', 'Otherside (Album Version)')).toBe(true);
  });

  it('ignora live, deluxe, mono y stereo', () => {
    expect(aceptaTitulo('Alive', 'Alive - Live')).toBe(true);
    expect(aceptaTitulo('Thriller', 'Thriller (Deluxe Edition)')).toBe(true);
    expect(aceptaTitulo('Help', 'Help - Mono')).toBe(true);
  });

  it('no se come la palabra si es parte del título', () => {
    // «Live and Let Die» no puede quedarse en «and Let Die».
    expect(normalizeAnswer('Live and Let Die')).toBe('live y let die');
    expect(aceptaTitulo('Live and Let Die', 'Live and Let Die')).toBe(true);
  });

  it('no vacía un título que es exactamente un sufijo', () => {
    expect(normalizeAnswer('Live')).toBe('live');
    expect(aceptaTitulo('Live', 'Live')).toBe(true);
  });
});

describe('colaboraciones', () => {
  it('ignora el feat entre paréntesis del título', () => {
    expect(aceptaTitulo('La Bachata', 'La Bachata (feat. Alguien)')).toBe(true);
  });

  it('acepta el artista principal aunque haya colaboradores', () => {
    expect(aceptaArtista('Bad Bunny', 'Bad Bunny feat. Artista')).toBe(true);
    expect(aceptaArtista('Bad Bunny', 'Bad Bunny & Artista')).toBe(true);
    expect(aceptaArtista('Bad Bunny', 'Bad Bunny, Artista')).toBe(true);
  });

  it('acepta también el nombre completo con colaboradores', () => {
    expect(aceptaArtista('Bad Bunny feat. Artista', 'Bad Bunny feat. Artista')).toBe(true);
  });

  it('NO acepta a un colaborador suelto', () => {
    // Responder solo el colaborador no identifica la canción.
    expect(aceptaArtista('Artista', 'Bad Bunny feat. Artista')).toBe(false);
    expect(aceptaArtista('Artista', 'Bad Bunny & Artista')).toBe(false);
  });

  it('extrae el artista principal de cada forma de colaboración', () => {
    expect(primaryArtist('Bad Bunny feat. Otro')).toBe('Bad Bunny');
    expect(primaryArtist('Bad Bunny ft Otro')).toBe('Bad Bunny');
    expect(primaryArtist('Bad Bunny & Otro')).toBe('Bad Bunny');
    expect(primaryArtist('Bad Bunny, Otro')).toBe('Bad Bunny');
    expect(primaryArtist('Bad Bunny')).toBe('Bad Bunny');
  });

  it('la tolerancia con el artista principal no aplica a los títulos', () => {
    // En un título, lo de después de la coma sigue siendo parte del título.
    expect(aceptaTitulo('Cierta', 'Cierta, Cosa')).toBe(false);
  });
});

describe('alias configurados', () => {
  it('acepta un título alternativo declarado', () => {
    const result = evaluateAnswer('La Macarena', {
      text: 'Macarena',
      aliases: ['La Macarena'],
      kind: 'TITLE',
    });
    expect(result.accepted).toBe(true);
    expect(result.matchType).toBe('ALIAS');
  });
});

describe('distancia de edición', () => {
  it('cuenta inserciones, borrados y sustituciones', () => {
    expect(damerauLevenshtein('casa', 'casa')).toBe(0);
    expect(damerauLevenshtein('casa', 'cosa')).toBe(1);
    expect(damerauLevenshtein('casa', 'cas')).toBe(1);
    expect(damerauLevenshtein('casa', 'casas')).toBe(1);
  });

  it('cuenta una transposición como un solo error', () => {
    // Es la errata típica al teclear rápido.
    expect(damerauLevenshtein('cancion', 'cnacion')).toBe(1);
  });
});

describe('tolerancia según longitud', () => {
  it('no perdona nada en respuestas cortas', () => {
    // A cinco letras o menos, una sola errata ya es otra palabra.
    expect(fuzzyToleranceFor(3)).toBe(0);
    expect(fuzzyToleranceFor(4)).toBe(0);
    expect(fuzzyToleranceFor(5)).toBe(0);
  });

  it('crece con la longitud, pero despacio', () => {
    expect(fuzzyToleranceFor(6)).toBe(1);
    expect(fuzzyToleranceFor(10)).toBe(2);
    expect(fuzzyToleranceFor(20)).toBe(3);
  });
});

describe('erratas razonables', () => {
  it('acepta una errata en un título largo', () => {
    const result = evaluateAnswer('tit me pregunto', { text: 'Titi Me Preguntó', kind: 'TITLE' });
    expect(result.accepted).toBe(true);
    expect(result.matchType).toBe('FUZZY');
    expect(result.similarity).toBeGreaterThan(0.9);
  });

  it('acepta una letra cambiada en un título medio', () => {
    expect(aceptaTitulo('Flowars', 'Flowers')).toBe(true);
  });

  it('acepta una transposición', () => {
    expect(aceptaTitulo('Blindign Lights', 'Blinding Lights')).toBe(true);
  });
});

describe('el fuzzy no puede ser un colador', () => {
  it('NO acepta Sal por Sol', () => {
    // El caso que justifica toda la regla de longitud.
    expect(aceptaTitulo('Sal', 'Sol')).toBe(false);
  });

  it('NO acepta cambiar una letra en palabras cortas', () => {
    expect(aceptaTitulo('Casa', 'Cosa')).toBe(false);
    expect(aceptaTitulo('Mar', 'Mal')).toBe(false);
    expect(aceptaTitulo('Ella', 'Bella')).toBe(false);
  });

  it('NO acepta demasiadas erratas aunque el título sea largo', () => {
    expect(aceptaTitulo('titu me preguntaba', 'Titi Me Preguntó')).toBe(false);
  });

  it('NO acepta una respuesta claramente distinta', () => {
    expect(aceptaTitulo('Despacito', 'Blinding Lights')).toBe(false);
    expect(aceptaArtista('Shakira', 'Bad Bunny')).toBe(false);
  });

  it('NO acepta responder solo una palabra de un título largo', () => {
    expect(aceptaTitulo('lights', 'Blinding Lights')).toBe(false);
  });

  it('NO acepta la cadena vacía ni espacios', () => {
    expect(aceptaTitulo('', 'Flowers')).toBe(false);
    expect(aceptaTitulo('   ', 'Flowers')).toBe(false);
    expect(evaluateAnswer('', { text: 'Flowers' }).matchType).toBe('REJECTED');
  });

  it('respeta el apagado del fuzzy', () => {
    const conFuzzy = evaluateAnswer('Flowars', { text: 'Flowers' }, { fuzzy: true });
    const sinFuzzy = evaluateAnswer('Flowars', { text: 'Flowers' }, { fuzzy: false });
    expect(conFuzzy.accepted).toBe(true);
    expect(sinFuzzy.accepted).toBe(false);
  });
});

describe('tipo de coincidencia informado', () => {
  it('distingue exacta de normalizada', () => {
    expect(evaluateAnswer('Flowers', { text: 'Flowers' }).matchType).toBe('EXACT');
    expect(evaluateAnswer('flowers', { text: 'Flowers' }).matchType).toBe('NORMALIZED');
    expect(evaluateAnswer('FLOWERS!', { text: 'Flowers' }).matchType).toBe('NORMALIZED');
  });

  it('devuelve siempre la entrada normalizada', () => {
    expect(evaluateAnswer('  Corazón  Partío ', { text: 'x' }).normalizedInput).toBe(
      'corazon partio',
    );
  });

  it('solo informa similitud en coincidencias difusas', () => {
    expect(evaluateAnswer('Flowers', { text: 'Flowers' }).similarity).toBeUndefined();
    expect(evaluateAnswer('Flowars', { text: 'Flowers' }).similarity).toBeDefined();
  });
});
