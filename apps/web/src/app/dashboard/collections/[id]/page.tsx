'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CheckCircle2,
  Copy,
  Loader2,
  Lock,
  Trash2,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type CollectionTrack = {
  id: string;
  position: number;
  title: string;
  artist: string;
  previewStatus: string | null;
};

type CollectionDetail = {
  id: string;
  name: string;
  description: string | null;
  isDemo: boolean;
  editable: boolean;
  trackCount: number;
  tracks: CollectionTrack[];
};

export default function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: collection, isLoading } = useQuery({
    queryKey: ['collection', id],
    queryFn: () => api<CollectionDetail>(`/collections/${id}`),
  });

  // El formulario arranca con lo que hay guardado
  useEffect(() => {
    if (!collection) return;
    setName(collection.name);
    setDescription(collection.description ?? '');
  }, [collection]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['collection', id] });
  const fail = (err: unknown, fallback: string) =>
    setError(err instanceof ApiError ? err.message : fallback);

  const save = useMutation({
    mutationFn: () =>
      api<void>(`/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, description: description || undefined }),
      }),
    onSuccess: () => {
      setError(null);
      void refresh();
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (e) => fail(e, 'No se pudo guardar'),
  });

  const remove = useMutation({
    mutationFn: () => api<void>(`/collections/${id}`, { method: 'DELETE' }),
    onSuccess: async () => {
      // Sin esto la lista seguiría mostrando la colección recién borrada
      await queryClient.invalidateQueries({ queryKey: ['collections'] });
      router.push('/dashboard/music');
    },
    onError: (e) => {
      setConfirmDelete(false);
      fail(e, 'No se pudo borrar');
    },
  });

  const duplicate = useMutation({
    mutationFn: () => api<{ id: string }>(`/collections/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (copy) => {
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
      router.push(`/dashboard/collections/${copy.id}`);
    },
    onError: (e) => fail(e, 'No se pudo copiar'),
  });

  const removeTrack = useMutation({
    mutationFn: (trackId: string) =>
      api<void>(`/collections/${id}/tracks/${trackId}`, { method: 'DELETE' }),
    onSuccess: () => {
      setError(null);
      void refresh();
    },
    onError: (e) => fail(e, 'No se pudo quitar la canción'),
  });

  const reorder = useMutation({
    mutationFn: (trackIds: string[]) =>
      api<void>(`/collections/${id}/tracks/order`, {
        method: 'PATCH',
        body: JSON.stringify({ trackIds }),
      }),
    onSuccess: () => {
      setError(null);
      void refresh();
    },
    onError: (e) => fail(e, 'No se pudo cambiar el orden'),
  });

  const move = (index: number, direction: -1 | 1) => {
    if (!collection) return;
    const ids = collection.tracks.map((t) => t.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    reorder.mutate(ids);
  };

  if (isLoading) {
    return (
      <p className="flex items-center gap-2 text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Cargando…
      </p>
    );
  }
  if (!collection) return <p role="alert">Esa colección ya no está.</p>;

  const playable = collection.tracks.filter((t) => t.previewStatus === 'AVAILABLE').length;

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard/music"
        className="mb-4 flex items-center gap-2 self-start font-mono text-xs uppercase tracking-[0.14em] text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toda la música
      </Link>

      <h1 className="font-display text-3xl leading-tight">{collection.name}</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
        {collection.trackCount} canciones · suenan {playable}
      </p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded border-2 border-accent-500 bg-accent-100 p-3 text-sm text-accent-600 dark:bg-rose-900 dark:text-rose-100"
        >
          {error}
        </p>
      )}

      {!collection.editable ? (
        <div className="card mt-6 flex flex-col gap-3 p-4">
          <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Lock className="h-4 w-4 shrink-0" aria-hidden />
            Esta colección la mantiene la aplicación, así que no se puede cambiar. Puedes jugar con
            ella cuando quieras, o hacerte una copia y dejarla a tu gusto.
          </p>
          <button
            onClick={() => duplicate.mutate()}
            disabled={duplicate.isPending}
            className="btn-secondary self-start"
          >
            <Copy className="h-4 w-4" aria-hidden />
            Hacer una copia editable
          </button>
        </div>
      ) : (
        <section className="card mt-6 p-4">
          <h2 className="eyebrow mb-3">Datos</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="label" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="label" htmlFor="descripcion">
                Descripción
              </label>
              <input
                id="descripcion"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
              />
            </div>
            <button
              type="submit"
              disabled={save.isPending || name.trim().length < 2}
              className="btn-primary"
            >
              Guardar cambios
            </button>
          </form>
        </section>
      )}

      <section className="card mt-6 p-4">
        <h2 className="eyebrow mb-3">Canciones</h2>
        {collection.tracks.length === 0 ? (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Todavía no tiene ninguna. Búscalas en{' '}
            <Link href="/dashboard/music" className="text-brand-600 hover:underline">
              Música
            </Link>{' '}
            y añádelas.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {collection.tracks.map((track, index) => (
              <li key={track.id} className="flex items-center gap-3 py-2">
                {track.previewStatus === 'AVAILABLE' ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" aria-label="Suena" />
                ) : (
                  <AlertTriangle
                    className="h-4 w-4 shrink-0 text-amber-500"
                    aria-label="Sin audio"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{track.title}</span>
                  <span className="block truncate text-slate-500 dark:text-slate-400">
                    {track.artist}
                  </span>
                </span>
                {collection.editable && (
                  <span className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => move(index, -1)}
                      disabled={index === 0 || reorder.isPending}
                      aria-label={`Subir ${track.title}`}
                      className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                    >
                      <ArrowUp className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => move(index, 1)}
                      disabled={index === collection.tracks.length - 1 || reorder.isPending}
                      aria-label={`Bajar ${track.title}`}
                      className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                    >
                      <ArrowDown className="h-4 w-4" aria-hidden />
                    </button>
                    <button
                      onClick={() => removeTrack.mutate(track.id)}
                      disabled={removeTrack.isPending}
                      aria-label={`Quitar ${track.title}`}
                      className="rounded p-1.5 text-accent-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {collection.editable && (
        <section className="card mt-6 p-4">
          <h2 className="eyebrow mb-3">Borrar</h2>
          {confirmDelete ? (
            <div role="alertdialog" className="flex flex-col gap-3">
              <p className="text-sm">
                Se borrará <strong>{collection.name}</strong> con sus {collection.trackCount}{' '}
                canciones. Las partidas que ya hayas jugado no se tocan.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button onClick={() => setConfirmDelete(false)} className="btn-secondary">
                  Mejor no
                </button>
                <button
                  onClick={() => remove.mutate()}
                  disabled={remove.isPending}
                  className="btn-danger"
                >
                  Borrar la colección
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="btn-secondary">
              <Trash2 className="h-4 w-4" aria-hidden />
              Borrar esta colección
            </button>
          )}
        </section>
      )}
    </div>
  );
}
