'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  ListMusic,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  artists: string[];
  album: string;
  durationMs: number;
};

type ImportResult = {
  collectionId: string;
  /** Canciones guardadas, que puede ser menos de las que tiene la lista. */
  imported: number;
  /** Las que se quedaron fuera por el tope. */
  skipped: number;
  total: number;
};

type CollectionTrack = {
  id: string;
  title: string;
  artist: string;
  /** `null` mientras no se ha comprobado si suena. */
  previewStatus: string | null;
};

type CollectionSummary = {
  id: string;
  name: string;
  trackCount: number;
  editable: boolean;
};

type CollectionDetail = {
  id: string;
  name: string;
  tracks: CollectionTrack[];
};

export default function MusicPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [playlist, setPlaylist] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ['spotify-status'],
    queryFn: () => api<{ configured: boolean }>('/spotify/status'),
  });

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => api<CollectionSummary[]>('/collections'),
  });

  const [targetId, setTargetId] = useState('');
  const [added, setAdded] = useState<Record<string, string>>({});

  const addTrack = useMutation({
    mutationFn: (spotifyTrackId: string) =>
      api<{ previewStatus: string }>('/spotify/add-track', {
        method: 'POST',
        body: JSON.stringify({ collectionId: targetId, spotifyTrackId }),
      }),
    onSuccess: (result, spotifyTrackId) => {
      setError(null);
      setAdded((prev) => ({ ...prev, [spotifyTrackId]: result.previewStatus }));
      void queryClient.invalidateQueries({ queryKey: ['collections'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'No se pudo añadir'),
  });

  const createCollection = useMutation({
    mutationFn: () =>
      api<{ id: string }>('/collections', {
        method: 'POST',
        body: JSON.stringify({ name: newName.trim() }),
      }),
    onSuccess: (created) => router.push(`/dashboard/collections/${created.id}`),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la colección'),
  });

  const search = useMutation({
    mutationFn: (q: string) => api<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(q)}`),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Búsqueda fallida'),
  });

  const importPlaylist = useMutation({
    mutationFn: () =>
      api<ImportResult>('/spotify/import-playlist', {
        method: 'POST',
        body: JSON.stringify({ playlist, name: collectionName || undefined }),
      }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'No se pudo importar la playlist'),
  });

  // El audio se resuelve por detrás, así que se va preguntando por la
  // colección hasta que no quede ninguna canción por comprobar.
  const importedId = importPlaylist.data?.collectionId;
  const { data: imported } = useQuery({
    queryKey: ['collection', importedId],
    queryFn: () => api<CollectionDetail>(`/collections/${importedId}`),
    enabled: Boolean(importedId),
    refetchInterval: (q) => {
      const tracks = q.state.data?.tracks;
      if (!tracks) return 2000;
      return tracks.some((t) => t.previewStatus === null) ? 2000 : false;
    },
  });

  const pending = imported?.tracks.filter((t) => t.previewStatus === null).length ?? 0;
  const playable = imported?.tracks.filter((t) => t.previewStatus === 'AVAILABLE').length ?? 0;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="font-display text-3xl leading-tight">Tu música</h1>

      {error && (
        <p role="alert" className="text-sm text-accent-500">
          {error}
        </p>
      )}

      <section className="card p-6">
        <h2 className="eyebrow mb-3">Tus colecciones</h2>
        {collections && collections.length > 0 ? (
          <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
            {collections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <Link href={`/dashboard/collections/${c.id}`} className="min-w-0 flex-1">
                  <span className="block truncate font-medium hover:text-brand-600">{c.name}</span>
                  <span className="block truncate text-slate-500 dark:text-slate-400">
                    {c.trackCount} canciones
                    {!c.editable && ' · de la aplicación'}
                  </span>
                </Link>
                <Link
                  href={`/dashboard/collections/${c.id}`}
                  className="shrink-0 font-mono text-xs uppercase tracking-[0.14em] text-slate-500 hover:text-brand-600"
                >
                  {c.editable ? 'Editar' : 'Ver'}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">Aún no tienes ninguna.</p>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            if (newName.trim().length >= 2) createCollection.mutate();
          }}
          className="mt-4 flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="input"
            placeholder="Nombre de la colección"
            aria-label="Nombre de la colección nueva"
            maxLength={80}
          />
          <button
            type="submit"
            disabled={createCollection.isPending || newName.trim().length < 2}
            className="btn-secondary shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Crear vacía
          </button>
        </form>
      </section>

      {status && !status.configured && (
        <p className="card flex items-start gap-2 p-4 text-sm text-slate-600 dark:text-slate-300">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
          Para buscar canciones e importar listas hace falta conectar Spotify. Mientras tanto puedes
          jugar con la colección que ya viene incluida.
        </p>
      )}

      {status?.configured && (
        <>
          <section className="card p-6">
            <h2 className="label flex items-center gap-2">
              <Search className="h-4 w-4 text-brand-500" aria-hidden />
              Buscar canciones
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                if (query.trim().length >= 2) search.mutate(query.trim());
              }}
              className="flex gap-2"
            >
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input"
                placeholder="Título o artista"
                aria-label="Buscar en Spotify"
              />
              <button type="submit" disabled={search.isPending} className="btn-primary shrink-0">
                {search.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Search className="h-4 w-4" aria-hidden />
                )}
                Buscar
              </button>
            </form>
            {search.data && search.data.length > 0 && (
              <div className="mt-4">
                <label className="label" htmlFor="destino">
                  Añadir a
                </label>
                <select
                  id="destino"
                  className="input"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">Elige una colección tuya…</option>
                  {(collections ?? [])
                    .filter((c) => c.editable)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
            {search.data && (
              <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
                {search.data.map((t) => (
                  <li key={t.spotifyTrackId} className="flex items-center gap-3 py-2 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{t.title}</span>
                      <span className="block truncate text-slate-500 dark:text-slate-400">
                        {t.artists.join(', ')} · {t.album}
                      </span>
                    </span>
                    {added[t.spotifyTrackId] ? (
                      <span className="flex shrink-0 items-center gap-1 font-mono text-xs uppercase tracking-wide text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" aria-hidden />
                        {added[t.spotifyTrackId] === 'AVAILABLE' ? 'Añadida' : 'Sin audio'}
                      </span>
                    ) : (
                      <button
                        onClick={() => addTrack.mutate(t.spotifyTrackId)}
                        disabled={!targetId || addTrack.isPending}
                        aria-label={`Añadir ${t.title}`}
                        className="btn-secondary w-auto shrink-0"
                      >
                        <Plus className="h-4 w-4" aria-hidden />
                        Añadir
                      </button>
                    )}
                  </li>
                ))}
                {search.data.length === 0 && (
                  <li className="py-2 text-sm text-slate-500">Sin resultados.</li>
                )}
              </ul>
            )}
          </section>

          <section className="card p-6">
            <h2 className="label flex items-center gap-2">
              <ListMusic className="h-4 w-4 text-brand-500" aria-hidden />
              Importar una playlist pública
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                importPlaylist.mutate();
              }}
              className="flex flex-col gap-3"
            >
              <input
                value={playlist}
                onChange={(e) => setPlaylist(e.target.value)}
                className="input"
                placeholder="https://open.spotify.com/playlist/…"
                required
              />
              <input
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                className="input"
                placeholder="Nombre de la colección (opcional)"
              />
              <button
                type="submit"
                disabled={importPlaylist.isPending || playlist.trim().length < 6}
                className="btn-primary"
              >
                {importPlaylist.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Guardando canciones…
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" aria-hidden />
                    Importar playlist
                  </>
                )}
              </button>
            </form>

            {importPlaylist.data && (
              <div className="mt-4">
                <p className="text-sm font-medium">
                  Guardadas {importPlaylist.data.imported} canciones.
                  {importPlaylist.data.skipped > 0 && (
                    <>
                      {' '}
                      La lista tiene {importPlaylist.data.total}, así que se han dejado fuera las{' '}
                      {importPlaylist.data.skipped} últimas.
                    </>
                  )}
                </p>

                <p className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  {pending > 0 ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      Comprobando cuáles suenan: {playable} listas, quedan {pending}.
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-hidden />
                      Suenan {playable} de {imported?.tracks.length ?? 0}. Ya puedes jugar con ella.
                    </>
                  )}
                </p>

                {imported && (
                  <ul className="mt-3 max-h-80 divide-y divide-slate-200 overflow-y-auto text-sm dark:divide-slate-800">
                    {imported.tracks.map((t) => (
                      <li key={t.id} className="flex items-center gap-3 py-2">
                        {t.previewStatus === null ? (
                          <Loader2
                            className="h-4 w-4 shrink-0 animate-spin text-slate-400"
                            aria-label="Comprobando"
                          />
                        ) : t.previewStatus === 'AVAILABLE' ? (
                          <CheckCircle2
                            className="h-4 w-4 shrink-0 text-emerald-500"
                            aria-label="Suena"
                          />
                        ) : (
                          <AlertTriangle
                            className="h-4 w-4 shrink-0 text-amber-500"
                            aria-label="Sin audio"
                          />
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{t.title}</span>
                          <span className="block truncate text-slate-500 dark:text-slate-400">
                            {t.artist}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  onClick={() => router.push('/dashboard/games/new')}
                  className="btn-primary mt-4 w-full"
                >
                  Crear partida con esta colección
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
