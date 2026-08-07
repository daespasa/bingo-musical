'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Suspense, useState } from 'react';
import { ArrowLeft, Music4 } from 'lucide-react';
import { api, ApiError, type PublicUser } from '@/lib/api';
import { GoogleButton } from '@/components/google-button';

type FormData = { email: string; password: string };

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const oauthFailed = searchParams.get('error') === 'google';
  const sessionExpired = searchParams.get('caducada') === '1';
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await api<PublicUser>('/auth/login', { method: 'POST', body: JSON.stringify(data) });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <span className="mb-5 grid h-11 w-11 place-items-center rounded-md border-2 border-slate-900 bg-brand-600 text-slate-50 dark:border-slate-100">
        <Music4 className="h-5 w-5" />
      </span>
      <h1 className="font-display text-3xl leading-tight tracking-tight">Qué bien verte</h1>
      <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-300">
        Accede para preparar tu próxima partida.
      </p>
      {sessionExpired && (
        <p
          role="status"
          className="mb-4 rounded border-2 border-amber-500 bg-amber-200 p-3 text-sm text-amber-700 dark:bg-amber-700 dark:text-amber-100"
        >
          Tu sesión ha caducado o se ha cerrado desde otro dispositivo. Vuelve a entrar.
        </p>
      )}
      {oauthFailed && (
        <p
          role="alert"
          className="mb-4 rounded border-2 border-accent-500 bg-accent-100 p-3 text-sm text-accent-600 dark:bg-rose-900 dark:text-rose-100"
        >
          No se pudo completar el acceso con Google. Inténtalo de nuevo.
        </p>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="email">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            className="input"
            {...register('email', { required: true })}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            className="input"
            {...register('password', { required: true })}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-accent-500">
            {error}
          </p>
        )}
        <button type="submit" disabled={isSubmitting} className="btn-primary">
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <GoogleButton label="Entrar con Google" />

      <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
        ¿Sin cuenta?{' '}
        <Link className="text-brand-600 hover:underline dark:text-brand-400" href="/register">
          Regístrate
        </Link>
      </p>
      <p className="data mt-2 text-xs text-slate-500 dark:text-slate-400">
        Demo: demo@bingo.local / Demo1234!
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 self-start font-mono text-xs uppercase tracking-[0.14em] text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
      <Suspense fallback={<div className="card h-96 animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
