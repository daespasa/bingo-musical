'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { useState } from 'react';
import { api, ApiError, type PublicUser } from '@/lib/api';

type FormData = { displayName: string; email: string; password: string };

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      await api<PublicUser>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear la cuenta');
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8">
        <h1 className="mb-6 text-2xl font-bold">Crear cuenta</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="displayName">
              Nombre
            </label>
            <input
              id="displayName"
              className="input"
              {...register('displayName', { required: true, minLength: 2, maxLength: 40 })}
            />
          </div>
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
              autoComplete="new-password"
              className="input"
              {...register('password', {
                required: true,
                minLength: { value: 8, message: 'Mínimo 8 caracteres' },
                pattern: {
                  value: /(?=.*[a-zA-Z])(?=.*\d)/,
                  message: 'Debe contener letras y números',
                },
              })}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-accent-500">{errors.password.message}</p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-accent-500">
              {error}
            </p>
          )}
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Creando…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
          ¿Ya tienes cuenta?{' '}
          <Link className="text-brand-600 hover:underline dark:text-brand-400" href="/login">
            Inicia sesión
          </Link>
        </p>
      </div>
    </main>
  );
}
