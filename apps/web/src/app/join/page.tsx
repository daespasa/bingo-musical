'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Headphones } from 'lucide-react';
import { isCompleteRoomCode } from '@bingo/shared';
import { RoomCodeInput } from '@/components/room-code-input';
import { QrScanButton } from '@/components/qr-scan-button';

export default function JoinPage() {
  const router = useRouter();
  const [code, setCode] = useState('');

  const enter = useCallback(
    (value: string) => {
      if (isCompleteRoomCode(value)) router.push(`/join/${value}`);
    },
    [router],
  );

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
        <p className="mb-6 mt-2 text-sm text-slate-600 dark:text-slate-300">
          Escribe el código de seis caracteres que te ha dado el anfitrión.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enter(code);
          }}
          className="flex flex-col gap-4"
        >
          <RoomCodeInput value={code} onChange={setCode} onComplete={enter} autoFocus />
          <button type="submit" disabled={!isCompleteRoomCode(code)} className="btn-primary">
            Continuar
          </button>
        </form>

        <QrScanButton onCode={enter} />
      </div>
    </main>
  );
}
