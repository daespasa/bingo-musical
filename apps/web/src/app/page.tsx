import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="mb-3 text-5xl" aria-hidden>
          🎵🎱
        </p>
        <h1 className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-5xl font-black text-transparent">
          Bingo Musical
        </h1>
        <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
          Reconoce la canción, marca tu cartón y canta ¡línea! o ¡bingo! antes que nadie.
        </p>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Link href="/join" className="btn-primary text-lg">
          🎧 Unirme a una partida
        </Link>
        <Link href="/login" className="btn-secondary">
          Soy anfitrión — Iniciar sesión
        </Link>
        <Link
          href="/register"
          className="text-sm text-brand-600 hover:underline dark:text-brand-400"
        >
          Crear una cuenta nueva
        </Link>
      </div>
    </main>
  );
}
