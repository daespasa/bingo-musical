'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Headphones } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-20 sm:px-6">
      <Link
        href="/"
        className="mb-4 flex items-center gap-2 self-start font-mono text-xs uppercase tracking-[0.14em] text-slate-500 hover:text-brand-600"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver
      </Link>
      <div className="card p-6 text-center sm:p-8">
        <span className="mx-auto mb-5 grid h-14 w-14 place-items-center rounded-md border-2 border-slate-900 bg-brand-600 text-slate-50 dark:border-slate-100">
          <Headphones className="h-7 w-7" aria-hidden />
        </span>
        <h1 className="font-display text-3xl leading-tight tracking-tight">Entra en la sala</h1>
        <p className="mb-6 mt-2 text-sm text-slate-500 dark:text-slate-400">
          Escribe el código que te ha dado el anfitrión.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length >= 4) router.push(`/join/${code.trim().toUpperCase()}`);
          }}
          className="flex flex-col gap-4"
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="CÓDIGO"
            maxLength={6}
            autoFocus
            className="input text-center font-mono text-2xl uppercase tracking-[0.28em] sm:text-3xl sm:tracking-[0.4em]"
            aria-label="Código de sala"
          />
          <button type="submit" disabled={code.trim().length < 4} className="btn-primary text-lg">
            Continuar
          </button>
        </form>
      </div>
    </main>
  );
}
