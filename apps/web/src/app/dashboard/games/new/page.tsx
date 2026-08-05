'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import type { CollectionSummary } from '@/lib/types';
import clsx from 'clsx';

type FormData = {
  name: string;
  collectionId: string;
  cardSize: number;
  freeCenter: boolean;
  snippetDurationMs: number;
  answerWindowMs: number;
  lineEnabled: boolean;
  bingoEnabled: boolean;
  showLeaderboard: boolean;
  shuffleTracks: boolean;
};

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
      cardSize: 3,
      freeCenter: false,
      snippetDurationMs: 15000,
      answerWindowMs: 10000,
      lineEnabled: true,
      bingoEnabled: true,
      showLeaderboard: true,
      shuffleTracks: true,
    },
  });
  const selectedCollection = watch('collectionId');
  const cardSize = watch('cardSize');

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const game = await api<{ id: string }>('/games', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          collectionId: data.collectionId,
          settings: {
            cardSize: Number(data.cardSize),
            freeCenter: data.freeCenter,
            snippetDurationMs: Number(data.snippetDurationMs),
            answerWindowMs: Number(data.answerWindowMs),
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
                <p className="font-semibold">
                  {c.isDemo ? '🎁 ' : '🎵 '}
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
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {(
              [
                ['freeCenter', 'Centro libre'],
                ['lineEnabled', 'Premio por línea'],
                ['bingoEnabled', 'Premio por bingo'],
                ['showLeaderboard', 'Ranking entre rondas'],
                ['shuffleTracks', 'Orden aleatorio de canciones'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-brand-600" {...register(key)} />
                {label}
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
