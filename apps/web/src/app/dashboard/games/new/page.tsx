'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import clsx from 'clsx';
import { Gift, ListMusic, Wand2 } from 'lucide-react';
import {
  BINGO_VARIANTS,
  type BingoRevealMode,
  type GameMode,
  type MultipleChoiceQuestionType,
} from '@bingo/shared';
import { api, ApiError } from '@/lib/api';
import { GameModeSelector } from '@/components/game-mode-selector';
import type { CollectionSummary } from '@/lib/types';

type FormData = {
  name: string;
  collectionId: string;
  mode: GameMode;
  revealMode: BingoRevealMode;
  /** Tipos de pregunta del quiz. Al menos uno. */
  questionTypes: MultipleChoiceQuestionType[];
  optionCount: number;
  cardSize: number;
  freeCenter: boolean;
  snippetDurationMs: number;
  answerWindowMs: number;
  autoReveal: boolean;
  autoAdvance: boolean;
  roundResultsMs: number;
  lineEnabled: boolean;
  bingoEnabled: boolean;
  showLeaderboard: boolean;
  shuffleTracks: boolean;
};

/**
 * Tipos de pregunta que el quiz ofrece hoy.
 *
 * Año y álbum existen en el dominio pero no se ofrecen aquí: dependen de
 * metadatos que las colecciones importadas no siempre traen, y una pregunta
 * sin datos fiables es una pregunta injusta.
 */
const QUIZ_QUESTION_TYPES: Array<{
  id: MultipleChoiceQuestionType;
  label: string;
  help: string;
}> = [
  { id: 'SONG_TITLE', label: 'Título', help: '¿Cómo se llama esta canción?' },
  { id: 'ARTIST', label: 'Artista', help: '¿De quién es esta canción?' },
  { id: 'DECADE', label: 'Década', help: '¿De qué década es? Necesita año en la colección.' },
];

const RULE_TOGGLES = [
  ['freeCenter', 'Centro libre', 'La casilla central cuenta como acertada (3×3 y 5×5).'],
  ['lineEnabled', 'Premio por línea', 'Los jugadores pueden cantar línea.'],
  ['bingoEnabled', 'Premio por bingo', 'Los jugadores pueden cantar bingo (termina la partida).'],
  ['showLeaderboard', 'Ranking entre rondas', 'Muestra la clasificación tras cada canción.'],
  ['shuffleTracks', 'Orden aleatorio', 'Baraja las canciones al empezar.'],
] as const;

export default function NewGamePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { data: collections, isLoading } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api<CollectionSummary[]>('/collections'),
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      mode: 'MUSIC_BINGO',
      revealMode: 'HIDDEN_UNTIL_REVEAL',
      questionTypes: ['SONG_TITLE'],
      optionCount: 4,
      cardSize: 3,
      freeCenter: false,
      snippetDurationMs: 15000,
      answerWindowMs: 10000,
      autoReveal: true,
      autoAdvance: true,
      roundResultsMs: 6000,
      lineEnabled: true,
      bingoEnabled: true,
      showLeaderboard: true,
      shuffleTracks: true,
    },
  });
  const selectedCollection = watch('collectionId');
  const cardSize = watch('cardSize');
  const autoReveal = watch('autoReveal');
  const mode = watch('mode');
  const revealMode = watch('revealMode');
  const questionTypes = watch('questionTypes');

  // Al menos un tipo de pregunta: sin ninguno no habría nada que preguntar.
  const toggleQuestionType = (tipo: MultipleChoiceQuestionType) => {
    const next = questionTypes.includes(tipo)
      ? questionTypes.filter((t) => t !== tipo)
      : [...questionTypes, tipo];
    if (next.length === 0) return;
    setValue('questionTypes', next);
  };
  // En bingo clásico la canción se ve desde el primer segundo, así que no hay
  // nada que reconocer de oído y las reglas de reconocimiento pierden sentido.
  const revealedFromStart = revealMode === 'VISIBLE_FROM_START';

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const game = await api<{ id: string }>('/games', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          collectionId: data.collectionId,
          mode: data.mode,
          // El servidor revalida esta configuración con el esquema del modo;
          // aquí solo se manda lo que el anfitrión ha elegido.
          modeConfig:
            data.mode === 'MULTIPLE_CHOICE'
              ? {
                  mode: 'MULTIPLE_CHOICE',
                  questionTypes: data.questionTypes,
                  optionCount: Number(data.optionCount),
                }
              : { mode: data.mode, revealMode: data.revealMode },
          settings: {
            cardSize: Number(data.cardSize),
            freeCenter: data.freeCenter,
            snippetDurationMs: Number(data.snippetDurationMs),
            answerWindowMs: Number(data.answerWindowMs),
            autoReveal: data.autoReveal,
            autoAdvance: data.autoAdvance,
            roundResultsMs: Number(data.roundResultsMs),
            lineEnabled: data.lineEnabled,
            bingoEnabled: data.bingoEnabled,
            showLeaderboard: data.showLeaderboard,
            shuffleTracks: data.shuffleTracks,
          },
        }),
      });
      router.push(`/dashboard/games/${game.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la partida');
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Nueva partida</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
        <div className="card p-6">
          <GameModeSelector
            value={mode}
            onSelectAction={(next) => setValue('mode', next, { shouldValidate: true })}
          />
        </div>

        {mode === 'MUSIC_BINGO' && (
          <div className="card p-6">
            <fieldset>
              <legend className="label">Variante del bingo</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {BINGO_VARIANTS.map((variant) => (
                  <button
                    key={variant.id}
                    type="button"
                    role="radio"
                    aria-checked={revealMode === variant.id}
                    onClick={() => setValue('revealMode', variant.id)}
                    className={clsx(
                      'rounded-xl border p-4 text-left transition',
                      revealMode === variant.id
                        ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                        : 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                    )}
                  >
                    <span className="font-semibold">{variant.name}</span>
                    <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                      {variant.description}
                    </span>
                  </button>
                ))}
              </div>
              {revealedFromStart && (
                <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                  Buena opción para grupos con niveles musicales muy distintos: nadie queda fuera
                  por no reconocer la canción de oído.
                </p>
              )}
            </fieldset>
          </div>
        )}

        {mode === 'MULTIPLE_CHOICE' && (
          <div className="card p-6">
            <fieldset>
              <legend className="label">¿Qué se pregunta?</legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {QUIZ_QUESTION_TYPES.map((tipo) => {
                  const activo = questionTypes.includes(tipo.id);
                  return (
                    <button
                      key={tipo.id}
                      type="button"
                      role="checkbox"
                      aria-checked={activo}
                      onClick={() => toggleQuestionType(tipo.id)}
                      className={clsx(
                        'rounded-xl border p-4 text-left transition',
                        activo
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                          : 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                      )}
                    >
                      <span className="font-semibold">{tipo.label}</span>
                      <span className="mt-1 block text-sm text-slate-500 dark:text-slate-400">
                        {tipo.help}
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                Con varios tipos, las rondas los van alternando.
              </p>
            </fieldset>

            <div className="mt-5">
              <label className="label" htmlFor="optionCount">
                Número de opciones
              </label>
              <select
                id="optionCount"
                className="input"
                {...register('optionCount', { valueAsNumber: true })}
              >
                <option value={2}>2</option>
                <option value={3}>3</option>
                <option value={4}>4</option>
              </select>
            </div>
          </div>
        )}

        <div className="card p-6">
          <label className="label" htmlFor="name">
            Nombre de la partida
          </label>
          <input
            id="name"
            className="input"
            placeholder="Fiesta del viernes"
            {...register('name', { required: true, minLength: 2 })}
          />
        </div>

        <div className="card p-6">
          <p className="label">Colección musical</p>
          {isLoading && (
            <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          )}
          <div className="flex flex-col gap-2">
            {collections?.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setValue('collectionId', c.id, { shouldValidate: true })}
                className={clsx(
                  'rounded-xl border p-4 text-left transition',
                  selectedCollection === c.id
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                    : 'border-slate-200 hover:border-brand-300 dark:border-slate-700',
                )}
              >
                <p className="flex items-center gap-2 font-semibold">
                  {c.isDemo ? (
                    <Gift className="h-4 w-4 text-brand-500" aria-hidden />
                  ) : (
                    <ListMusic className="h-4 w-4 text-brand-500" aria-hidden />
                  )}
                  {c.name}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {c.trackCount} canciones{c.description ? ` · ${c.description}` : ''}
                </p>
              </button>
            ))}
          </div>
          <input type="hidden" {...register('collectionId', { required: true })} />
        </div>

        <div className="card p-6">
          <p className="label">Cartón</p>
          <div className="mb-4 flex gap-2">
            {[3, 4, 5].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => setValue('cardSize', size)}
                className={clsx(
                  'flex-1 rounded-xl border py-3 font-semibold transition',
                  Number(cardSize) === size
                    ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30'
                    : 'border-slate-200 dark:border-slate-700',
                )}
              >
                {size} × {size}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="snippet">
                Duración del fragmento (s)
              </label>
              <select
                id="snippet"
                className="input"
                {...register('snippetDurationMs', { valueAsNumber: true })}
              >
                <option value={10000}>10</option>
                <option value={15000}>15</option>
                <option value={20000}>20</option>
                <option value={30000}>30</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="window">
                Tiempo extra de respuesta (s)
              </label>
              <select
                id="window"
                className="input"
                {...register('answerWindowMs', { valueAsNumber: true })}
              >
                <option value={5000}>5</option>
                <option value={10000}>10</option>
                <option value={15000}>15</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="label flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-brand-500" aria-hidden />
            Ritmo de la partida
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-brand-600"
                {...register('autoReveal')}
              />
              <span>
                <span className="font-medium">Revelar la canción automáticamente</span>
                <span className="block text-slate-500 dark:text-slate-400">
                  Al cerrarse la ventana de respuesta se muestra el título y el artista sin que el
                  anfitrión tenga que pulsar nada. Desactívalo para revelar a mano.
                </span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-brand-600"
                {...register('autoAdvance')}
                disabled={!autoReveal}
              />
              <span className={clsx(!autoReveal && 'opacity-50')}>
                <span className="font-medium">Encadenar rondas automáticamente</span>
                <span className="block text-slate-500 dark:text-slate-400">
                  Tras mostrar los resultados salta sola a la siguiente canción.
                </span>
              </span>
            </label>
            <div>
              <label className="label" htmlFor="results">
                Pausa de resultados entre rondas (s)
              </label>
              <select
                id="results"
                className="input"
                {...register('roundResultsMs', { valueAsNumber: true })}
              >
                <option value={3000}>3</option>
                <option value={6000}>6</option>
                <option value={10000}>10</option>
                <option value={15000}>15</option>
              </select>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <p className="label">Reglas</p>
          <div className="flex flex-col gap-3">
            {RULE_TOGGLES.map(([key, label, help]) => (
              <label key={key} className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-brand-600"
                  {...register(key)}
                />
                <span>
                  <span className="font-medium">{label}</span>
                  <span className="block text-slate-500 dark:text-slate-400">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-accent-500">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={isSubmitting || !selectedCollection}
          className="btn-primary"
        >
          {isSubmitting ? 'Creando…' : 'Crear partida'}
        </button>
      </form>
    </div>
  );
}
