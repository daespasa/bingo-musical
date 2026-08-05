'use client';

import { useRef, useState } from 'react';
import type { CollectionTrack } from '@/lib/types';

export function TrackList({ tracks }: { tracks: CollectionTrack[] }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

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
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200 disabled:opacity-40 dark:bg-brand-900 dark:text-brand-300"
          >
            {playingId === track.id ? '⏸' : '▶'}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{track.title}</p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{track.artist}</p>
          </div>
          <span className="text-xs text-slate-400">
            {track.previewStatus === 'AVAILABLE' ? '✅' : '⚠️'}
          </span>
        </div>
      ))}
    </div>
  );
}
