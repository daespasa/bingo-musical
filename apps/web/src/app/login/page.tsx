'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { api, ApiError, type PublicUser } from '@/lib/api';

type FormData = { email: string; password: string };

export default function LoginPage() {
  const router = useRouter();
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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        <h1 className="mb-6 text-2xl font-bold">Iniciar sesión</h1>
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
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          ¿Sin cuenta?{' '}
          <Link className="text-brand-600 hover:underline dark:text-brand-400" href="/register">
            Regístrate
          </Link>
        </p>
        <p className="mt-2 text-xs text-slate-400">Demo: demo@bingo.local / Demo1234!</p>
      </div>
    </main>
  );
}
