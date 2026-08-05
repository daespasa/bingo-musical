'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Pause, Play } from 'lucide-react';
import type { CollectionTrack } from '@/lib/types';

export function TrackList({ tracks }: { tracks: CollectionTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  const toggle = (track: CollectionTrack) => {
    if (!track.previewUrl) return;
    if (playingId === track.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.addEventListener('ended', () => setPlayingId(null));
    }
    audioRef.current.src = track.previewUrl;
    void audioRef.current.play();
    setPlayingId(track.id);
  };

  return (
    <div className="card divide-y divide-slate-200 dark:divide-slate-800">
      {tracks.map((track) => (
        <div key={track.id} className="flex items-center gap-4 p-4">
          <button
            onClick={() => toggle(track)}
            disabled={!track.previewUrl}
            aria-label={playingId === track.id ? 'Pausar' : `Escuchar ${track.title}`}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 transition hover:bg-brand-200 active:scale-95 disabled:opacity-40 dark:bg-brand-900 dark:text-brand-300"
          >
            {playingId === track.id ? (
              <Pause className="h-4 w-4 fill-current" aria-hidden />
            ) : (
              <Play className="h-4 w-4 fill-current" aria-hidden />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{track.title}</p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{track.artist}</p>
          </div>
          {track.previewStatus === 'AVAILABLE' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" aria-label="Preview disponible" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-label="Preview no disponible" />
          )}
        </div>
      ))}
    </div>
  );
}
