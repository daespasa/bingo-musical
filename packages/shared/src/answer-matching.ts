/**
 * Comparación de respuestas escritas.
 *
 * Vive aparte de `normalizeText` a propósito: aquella normaliza títulos y
 * nombres para las **claves de la base de datos**, y cambiarla rompería las
 * búsquedas existentes. Esta trabaja sobre lo que una persona teclea con
 * prisa en el móvil, que es un problema distinto.
 *
 * Toda la evaluación ocurre en el servidor. Aquí no se usa IA ni ningún
 * servicio externo: son reglas explícitas y comprobables.
 */

export type AnswerMatchType = 'EXACT' | 'ALIAS' | 'NORMALIZED' | 'FUZZY' | 'REJECTED';

export type AnswerEvaluation = {
  accepted: boolean;
  normalizedInput: string;
  matchType: AnswerMatchType;
  /** Solo en coincidencias difusas: 0..1, cuánto se parecen. */
  similarity?: number;
};

/**
 * Sufijos técnicos que no cambian de qué canción hablamos.
 *
 * Se quitan solo cuando aparecen **al final** o entre paréntesis, nunca en
 * mitad del título: «Live and Let Die» no es «and Let Die».
 */
const TECHNICAL_SUFFIXES = [
  'remastered',
  'remaster',
  'radio edit',
  'radio mix',
  'single version',
  'album version',
  'deluxe edition',
  'deluxe',
  'live',
  'mono',
  'stereo',
  'version',
  'versión',
  'edit',
  'bonus track',
];

/** Marcas de colaboración: lo que separa al artista principal del resto. */
const COLLABORATION_SEPARATORS =
  /\s+(?:feat\.?|ft\.?|featuring|con|with|vs\.?|y|and|&|x)\s+|\s*[,&]\s*/i;

function stripDiacritics(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Normaliza una respuesta escrita.
 *
 * No elimina palabras arbitrariamente: solo baja a minúsculas, quita
 * diacríticos y puntuación, unifica `&`/`and`/`y` y recorta los sufijos
 * técnicos de la lista.
 */
export function normalizeAnswer(value: string): string {
  let text = stripDiacritics(value.toLowerCase());

  // Apóstrofes y comillas tipográficas desaparecen sin dejar hueco, para que
  // «rock'n'roll» y «rocknroll» acaben igual.
  text = text.replace(/['’`´]/g, '');

  // Contenido entre paréntesis o corchetes que sea solo un sufijo técnico.
  text = text.replace(/[([{]([^)\]}]*)[)\]}]/g, (_match, inner: string) => {
    const cleaned = stripDiacritics(inner.toLowerCase())
      .replace(/[^a-z0-9\s]/g, ' ')
      .trim();
    const esTecnico =
      TECHNICAL_SUFFIXES.some((suffix) => cleaned.startsWith(stripDiacritics(suffix))) ||
      /^(feat|ft|featuring|con|with)\b/.test(cleaned);
    return esTecnico ? ' ' : ` ${inner} `;
  });

  // `&` y `and` se unifican en `y`, para que las tres formas coincidan.
  text = text.replace(/\s*&\s*/g, ' y ');
  text = text.replace(/\b(and)\b/g, 'y');

  // Guiones y barras pasan a espacio: separan, no significan.
  text = text.replace(/[-–—/_]+/g, ' ');

  text = text
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Sufijo técnico suelto al final, ya sin puntuación que lo delimite.
  for (const suffix of TECHNICAL_SUFFIXES) {
    const plain = stripDiacritics(suffix);
    // Solo si queda algo delante: «Live» a secas sí es un título.
    const pattern = new RegExp(`\\s+${plain}(\\s+\\d{2,4})?$`);
    if (pattern.test(text)) text = text.replace(pattern, '').trim();
  }

  return text;
}

/**
 * El artista principal de una cadena con colaboraciones.
 *
 * «Bad Bunny feat. Artista», «Bad Bunny & Artista» y «Bad Bunny, Artista»
 * tienen todos a Bad Bunny como principal.
 */
export function primaryArtist(value: string): string {
  const [first] = value.split(COLLABORATION_SEPARATORS);
  return (first ?? value).trim();
}

/**
 * Distancia de Damerau-Levenshtein (alineamiento óptimo).
 *
 * Cuenta inserciones, borrados, sustituciones y **transposiciones** de letras
 * contiguas, que es la errata más común al teclear con el pulgar.
 */
export function damerauLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const rows: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );

  for (let i = 0; i <= a.length; i++) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j++) rows[0]![j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let value = Math.min(
        rows[i - 1]![j]! + 1, // borrado
        rows[i]![j - 1]! + 1, // inserción
        rows[i - 1]![j - 1]! + cost, // sustitución
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        value = Math.min(value, rows[i - 2]![j - 2]! + 1); // transposición
      }
      rows[i]![j] = value;
    }
  }

  return rows[a.length]![b.length]!;
}

/**
 * Cuántas erratas se toleran según la longitud de la respuesta esperada.
 *
 * Es deliberadamente conservador con las respuestas cortas: con tres letras,
 * una sola errata convierte «Sol» en «Sal», que es **otra** respuesta. Cuanto
 * más larga es la cadena, menos probable es que una distancia pequeña sea una
 * coincidencia casual.
 */
export function fuzzyToleranceFor(length: number): number {
  // Hasta cinco letras no se perdona nada: «Ella» y «Bella», «Sol» y «Sal» o
  // «Casa» y «Cosa» están a una sola letra y son respuestas distintas.
  if (length <= 5) return 0;
  if (length <= 8) return 1;
  if (length <= 12) return 2;
  return 3;
}

/** Además del número de erratas, exigimos un parecido mínimo global. */
const MIN_SIMILARITY = 0.8;

export type ExpectedAnswer = {
  /** La respuesta canónica. */
  text: string;
  /** Títulos o nombres alternativos aceptados tal cual. */
  aliases?: readonly string[];
  /**
   * Con `ARTIST`, se acepta también el artista principal a secas. No al revés:
   * un colaborador suelto no vale como respuesta.
   */
  kind?: 'TITLE' | 'ARTIST';
};

export type EvaluateOptions = {
  /** Permitir erratas razonables. Por defecto sí. */
  fuzzy?: boolean;
};

/**
 * Juzga una respuesta escrita contra la esperada.
 *
 * El orden va de más estricto a más laxo, para que el tipo de coincidencia
 * que se informa sea el más exigente que encaja.
 */
export function evaluateAnswer(
  input: string,
  expected: ExpectedAnswer,
  options: EvaluateOptions = {},
): AnswerEvaluation {
  const fuzzy = options.fuzzy ?? true;
  const normalizedInput = normalizeAnswer(input);

  if (normalizedInput.length === 0) {
    return { accepted: false, normalizedInput, matchType: 'REJECTED' };
  }

  // 1. Exacto: tal cual se escribió, sin tocar nada.
  if (input.trim() === expected.text.trim()) {
    return { accepted: true, normalizedInput, matchType: 'EXACT' };
  }

  // 2. Alias configurado por quien preparó la colección.
  for (const alias of expected.aliases ?? []) {
    if (normalizeAnswer(alias) === normalizedInput) {
      return { accepted: true, normalizedInput, matchType: 'ALIAS' };
    }
  }

  // 3. Igual una vez normalizado: acentos, mayúsculas, puntuación, «feat».
  const candidates = acceptableForms(expected);
  if (candidates.includes(normalizedInput)) {
    return { accepted: true, normalizedInput, matchType: 'NORMALIZED' };
  }

  // 4. Errata razonable.
  if (fuzzy) {
    let best: { distance: number; similarity: number; target: string } | null = null;
    for (const target of candidates) {
      const distance = damerauLevenshtein(normalizedInput, target);
      const similarity = 1 - distance / Math.max(normalizedInput.length, target.length);
      if (!best || distance < best.distance) best = { distance, similarity, target };
    }

    if (best) {
      const tolerance = fuzzyToleranceFor(best.target.length);
      if (best.distance > 0 && best.distance <= tolerance && best.similarity >= MIN_SIMILARITY) {
        return {
          accepted: true,
          normalizedInput,
          matchType: 'FUZZY',
          similarity: Number(best.similarity.toFixed(3)),
        };
      }
    }
  }

  return { accepted: false, normalizedInput, matchType: 'REJECTED' };
}

/** Las formas normalizadas que se dan por buenas para una respuesta. */
function acceptableForms(expected: ExpectedAnswer): string[] {
  const forms = new Set<string>([normalizeAnswer(expected.text)]);

  if (expected.kind === 'ARTIST') {
    // Se acepta el artista principal aunque la respuesta canónica incluya
    // colaboradores. Lo contrario no: aceptar a cualquier colaborador suelto
    // daría por buena una respuesta que no identifica la canción.
    const principal = primaryArtist(expected.text);
    if (principal.length > 0) forms.add(normalizeAnswer(principal));
  }

  forms.delete('');
  return [...forms];
}
