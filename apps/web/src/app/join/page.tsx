'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Headphones } from 'lucide-react';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="card p-8 text-center">
        <Headphones className="mx-auto mb-3 h-10 w-10 text-brand-500" aria-hidden />
        <h1 className="mb-6 text-2xl font-bold">Unirse a una partida</h1>
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
            className="input text-center text-3xl font-black uppercase tracking-[0.4em]"
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
