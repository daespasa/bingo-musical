'use client';

import { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Music4 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { saveGuestSession, loadGuestSession, type RoomPublic } from '@/lib/types';

export default function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = use(params);
  const router = useRouter();
  const [alias, setAlias] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const {
    data: room,
    isLoading,
    error: roomError,
  } = useQuery({
    queryKey: ['room', code],
    queryFn: () => api<RoomPublic>(`/rooms/${code}`),
    retry: false,
  });

  const join = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJoining(true);
    try {
      const existing = loadGuestSession(code);
      if (existing) {
        router.push(`/room/${code}/play`);
        return;
      }
      const session = await api<{
        participantId: string;
        roomId: string;
        alias: string;
        token: string;
      }>(`/rooms/${code}/join`, { method: 'POST', body: JSON.stringify({ alias }) });
      saveGuestSession({ ...session, code: code.toUpperCase() });
      router.push(`/room/${code}/play`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo entrar en la sala');
      setJoining(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        {isLoading && (
          <div className="h-32 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
        )}
        {roomError && (
          <p role="alert" className="text-center text-accent-500">
            Sala no encontrada o caducada.
          </p>
        )}
        {room && (
          <>
            <p className="text-center text-sm uppercase tracking-wide text-slate-400">
              Sala {room.code}
            </p>
            <h1 className="mb-1 text-center text-2xl font-bold">{room.gameName}</h1>
            <p className="mb-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {room.participantCount} jugadores dentro · cartón {room.cardSize}×{room.cardSize}
            </p>
            <form onSubmit={join} className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="alias">
                  Tu alias
                </label>
                <input
                  id="alias"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  minLength={2}
                  maxLength={20}
                  required
                  autoFocus
                  className="input text-center text-xl font-semibold"
                  placeholder="DJ Increíble"
                />
              </div>
              {error && (
                <p role="alert" className="text-sm text-accent-500">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={joining || alias.trim().length < 2}
                className="btn-primary text-lg"
              >
                <Music4 className="h-5 w-5" aria-hidden />
                {joining ? 'Entrando…' : '¡A jugar!'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
