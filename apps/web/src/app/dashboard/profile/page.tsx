'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, LogOut } from 'lucide-react';
import { api, ApiError, type PublicUser } from '@/lib/api';

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => api<PublicUser>('/auth/me') });

  useEffect(() => {
    if (user) setDisplayName(user.displayName);
  }, [user]);

  const fail = (e: unknown, fallback: string) => {
    setDone(null);
    setError(e instanceof ApiError ? e.message : fallback);
  };

  const saveName = useMutation({
    mutationFn: () =>
      api<PublicUser>('/auth/me', { method: 'PATCH', body: JSON.stringify({ displayName }) }),
    onSuccess: () => {
      setError(null);
      setDone('Nombre guardado.');
      void queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => fail(e, 'No se pudo guardar el nombre'),
  });

  const changePassword = useMutation({
    mutationFn: () =>
      api<void>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      }),
    onSuccess: () => {
      setError(null);
      setDone('Contraseña cambiada.');
      setCurrent('');
      setNext('');
    },
    onError: (e) => fail(e, 'No se pudo cambiar la contraseña'),
  });

  const closeOthers = useMutation({
    mutationFn: () => api<{ closed: number }>('/auth/logout-others', { method: 'POST' }),
    onSuccess: (r) => {
      setError(null);
      setDone(
        r.closed === 0
          ? 'No había ninguna otra sesión abierta.'
          : `Se han cerrado ${r.closed} sesiones.`,
      );
    },
    onError: (e) => fail(e, 'No se pudieron cerrar las sesiones'),
  });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl leading-tight">Tu cuenta</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user?.email}</p>

      {error && (
        <p
          role="alert"
          className="mt-4 rounded border-2 border-accent-500 bg-accent-100 p-3 text-sm text-accent-600 dark:bg-rose-900 dark:text-rose-100"
        >
          {error}
        </p>
      )}
      {done && (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 rounded border-2 border-emerald-500 bg-emerald-100 p-3 text-sm text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
          {done}
        </p>
      )}

      <section className="card mt-6 p-4">
        <h2 className="eyebrow mb-3">Cómo te ve la gente</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveName.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <div>
            <label className="label" htmlFor="nombre">
              Tu nombre
            </label>
            <input
              id="nombre"
              className="input"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Es el nombre que aparece cuando montas una partida.
            </p>
          </div>
          <button
            type="submit"
            disabled={saveName.isPending || displayName.trim().length < 2}
            className="btn-primary self-start"
          >
            Guardar nombre
          </button>
        </form>
      </section>

      {user?.hasPassword && (
        <section className="card mt-6 p-4">
          <h2 className="eyebrow mb-3">Contraseña</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              changePassword.mutate();
            }}
            className="flex flex-col gap-3"
          >
            <div>
              <label className="label" htmlFor="actual">
                Contraseña actual
              </label>
              <input
                id="actual"
                type="password"
                autoComplete="current-password"
                className="input"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="nueva">
                Contraseña nueva
              </label>
              <input
                id="nueva"
                type="password"
                autoComplete="new-password"
                className="input"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Al menos 8 caracteres, con una letra y un número.
              </p>
            </div>
            <button
              type="submit"
              disabled={changePassword.isPending || current.length < 8 || next.length < 8}
              className="btn-primary self-start"
            >
              Cambiar contraseña
            </button>
          </form>
        </section>
      )}

      <section className="card mt-6 p-4">
        <h2 className="eyebrow mb-3">Otros dispositivos</h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Si has entrado desde un móvil prestado o un ordenador que no es tuyo, ciérralo desde aquí.
          Esta sesión seguirá abierta.
        </p>
        <button
          onClick={() => closeOthers.mutate()}
          disabled={closeOthers.isPending}
          className="btn-secondary mt-3 self-start"
        >
          <LogOut className="h-4 w-4" aria-hidden />
          Cerrar sesión en los demás dispositivos
        </button>
      </section>
    </div>
  );
}
