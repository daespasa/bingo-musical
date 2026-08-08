import { seededShuffle } from '@bingo/shared';
import type { MultipleChoiceQuestionType } from '@bingo/shared';
import type { RoundTrack } from './game-mode-handler';

/**
 * Construcción de preguntas con opciones.
 *
 * Es lógica pura a propósito: no toca la base de datos ni el reloj, así que se
 * puede probar exhaustivamente. Lo que sí recibe es un generador aleatorio
 * sembrado, para que una misma ronda produzca siempre la misma pregunta —si no,
 * un jugador que reconecta podría ver opciones distintas a las de los demás.
 */

export type QuizQuestionDraft = {
  type: MultipleChoiceQuestionType;
  prompt: string;
  correctText: string;
  /** Opciones ya barajadas. La correcta está entre ellas exactamente una vez. */
  options: string[];
};

const PROMPTS: Record<MultipleChoiceQuestionType, string> = {
  SONG_TITLE: '¿Cómo se llama esta canción?',
  ARTIST: '¿De quién es esta canción?',
  RELEASE_YEAR: '¿De qué año es esta canción?',
  DECADE: '¿De qué década es esta canción?',
  ALBUM: '¿A qué álbum pertenece?',
};

/** Década a la que pertenece un año, como texto visible. */
export function decadeOf(year: number): string {
  return `${Math.floor(year / 10) * 10}s`;
}

/**
 * Qué texto responde correctamente a cada tipo de pregunta.
 * `null` significa que esta pista no puede sostener esa pregunta.
 */
function correctAnswerFor(type: MultipleChoiceQuestionType, track: RoundTrack): string | null {
  switch (type) {
    case 'SONG_TITLE':
      return track.title;
    case 'ARTIST':
      return track.artist;
    case 'ALBUM':
      return track.album;
    case 'RELEASE_YEAR':
      return track.releaseYear === null ? null : String(track.releaseYear);
    case 'DECADE':
      return track.releaseYear === null ? null : decadeOf(track.releaseYear);
  }
}

/** Los tipos que la colección puede sostener con los metadatos que tiene. */
export function supportedQuestionTypes(
  pool: readonly RoundTrack[],
  requested: readonly MultipleChoiceQuestionType[],
): MultipleChoiceQuestionType[] {
  return requested.filter((type) => {
    // Hace falta que existan suficientes respuestas *distintas*, o no habría
    // con qué construir distractores y la pregunta se respondería sola.
    const values = new Set(
      pool.map((track) => correctAnswerFor(type, track)).filter((v): v is string => v !== null),
    );
    return values.size >= 2;
  });
}

/**
 * Genera los distractores de una pregunta.
 *
 * Salen siempre de la misma colección: un distractor traído de fuera se
 * reconoce al instante y convierte la pregunta en un regalo.
 */
function distractorsFor(
  type: MultipleChoiceQuestionType,
  track: RoundTrack,
  pool: readonly RoundTrack[],
  correct: string,
  wanted: number,
  rng: () => number,
): string[] {
  const candidates = new Set<string>();

  for (const other of pool) {
    if (other.id === track.id) continue;
    const value = correctAnswerFor(type, other);
    if (value === null) continue;
    // Comparación laxa: si otra pista se titula igual, no es un distractor,
    // es la misma respuesta escrita dos veces.
    if (value.toLowerCase().trim() === correct.toLowerCase().trim()) continue;
    candidates.add(value);
  }

  const picked = seededShuffle([...candidates], rng).slice(0, wanted);

  // Las décadas admiten relleno razonable cuando la colección es pequeña:
  // décadas vecinas siguen siendo respuestas creíbles, no disparates.
  if (type === 'DECADE' && picked.length < wanted && track.releaseYear !== null) {
    const base = Math.floor(track.releaseYear / 10) * 10;
    const used = new Set([correct, ...picked]);
    for (const offset of [-10, 10, -20, 20, -30, 30]) {
      if (picked.length >= wanted) break;
      const candidate = `${base + offset}s`;
      if (base + offset < 1950 || base + offset > 2030) continue;
      if (used.has(candidate)) continue;
      used.add(candidate);
      picked.push(candidate);
    }
  }

  return picked;
}

/**
 * Arma la pregunta de una ronda. Devuelve `null` cuando la colección no da
 * para construirla con opciones suficientes: es preferible saltar el tipo que
 * enseñar una pregunta con una sola opción.
 */
export function buildQuizQuestion(args: {
  type: MultipleChoiceQuestionType;
  track: RoundTrack;
  pool: readonly RoundTrack[];
  optionCount: number;
  rng: () => number;
}): QuizQuestionDraft | null {
  const { type, track, pool, optionCount, rng } = args;
  const correct = correctAnswerFor(type, track);
  if (correct === null) return null;

  const distractors = distractorsFor(type, track, pool, correct, optionCount - 1, rng);
  if (distractors.length === 0) return null;

  const options = seededShuffle([correct, ...distractors], rng);

  return {
    type,
    prompt: PROMPTS[type],
    correctText: correct,
    options,
  };
}
