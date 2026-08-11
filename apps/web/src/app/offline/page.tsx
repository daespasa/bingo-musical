import { WifiOff } from 'lucide-react';
import { brandTitle } from '@bingo/shared';

export const metadata = { title: brandTitle('Sin conexión') };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <WifiOff className="h-12 w-12 text-slate-400" aria-hidden />
      <h1 className="text-2xl font-bold">Sin conexión</h1>
      <p className="text-slate-500 dark:text-slate-400">
        No hay red ahora mismo. En cuanto vuelvas a tener conexión, la partida se reanudará sola: tu
        cartón y tus puntos están a salvo.
      </p>
    </main>
  );
}
