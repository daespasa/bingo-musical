'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Info,
  ListMusic,
  Loader2,
  Search,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';

type SpotifyTrack = {
  spotifyTrackId: string;
  title: string;
  artists: string[];
  album: string;
  durationMs: number;
};

type ImportedTrack = {
  trackId: string;
  title: string;
  artist: string;
  previewStatus: string;
  confidence: number;
};

export default function MusicPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [playlist, setPlaylist] = useState('');
  const [collectionName, setCollectionName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: status } = useQuery({
    queryKey: ['spotify-status'],
    queryFn: () => api<{ configured: boolean }>('/spotify/status'),
  });

  const search = useMutation({
    mutationFn: (q: string) => api<SpotifyTrack[]>(`/spotify/search?q=${encodeURIComponent(q)}`),
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Búsqueda fallida'),
  });

  const importPlaylist = useMutation({
    mutationFn: () =>
      api<{ collectionId: string; tracks: ImportedTrack[] }>('/spotify/import-playlist', {
        method: 'POST',
        body: JSON.stringify({ playlist, name: collectionName || undefined }),
      }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'No se pudo importar la playlist'),
  });

  if (status && !status.configured) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-2xl font-bold">Música de Spotify</h1>
        <div className="card flex flex-col gap-4 p-8">
          <p className="flex items-center gap-2 font-semibold">
            <Info className="h-5 w-5 text-brand-500" aria-hidden />
            Spotify no está configurado
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            La búsqueda y la importación de playlists necesitan credenciales de la Spotify Web API.
            Crea una aplicación en el panel de desarrolladores de Spotify y añade a tu{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">.env</code>:
          </p>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
            {`SPOTIFY_CLIENT_ID=tu-client-id\nSPOTIFY_CLIENT_SECRET=tu-client-secret`}
          </pre>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Mientras tanto puedes jugar con la colección demo incluida, que funciona sin ninguna
            credencial.
          </p>
          <button onClick={() => router.push('/dashboard/games/new')} className="btn-primary">
            Crear partida con la colección demo
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Música de Spotify</h1>

      {error && (
        <p role="alert" className="text-sm text-accent-500">
          {error}
        </p>
      )}

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
        {search.data && (
          <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {search.data.map((t) => (
              <li key={t.spotifyTrackId} className="py-2 text-sm">
                <p className="font-medium">{t.title}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {t.artists.join(', ')} · {t.album}
                </p>
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
                Importando y resolviendo previews…
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
            <p className="mb-2 text-sm font-medium">
              {importPlaylist.data.tracks.filter((t) => t.previewStatus === 'AVAILABLE').length} de{' '}
              {importPlaylist.data.tracks.length} canciones tienen preview reproducible.
            </p>
            <ul className="max-h-80 divide-y divide-slate-200 overflow-y-auto text-sm dark:divide-slate-800">
              {importPlaylist.data.tracks.map((t) => (
                <li key={t.trackId} className="flex items-center gap-3 py-2">
                  {t.previewStatus === 'AVAILABLE' ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-500"
                      aria-label="Disponible"
                    />
                  ) : (
                    <AlertTriangle
                      className="h-4 w-4 shrink-0 text-amber-500"
                      aria-label="No disponible"
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="block truncate text-slate-500 dark:text-slate-400">
                      {t.artist}
                      {t.previewStatus === 'AVAILABLE' && t.confidence < 0.8 && (
                        <span className="ml-2 text-amber-600">
                          coincidencia dudosa ({Math.round(t.confidence * 100)}%)
                        </span>
                      )}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => router.push('/dashboard/games/new')}
              className="btn-primary mt-4 w-full"
            >
              Crear partida con esta colección
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
