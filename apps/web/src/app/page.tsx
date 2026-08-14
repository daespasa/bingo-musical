import Link from 'next/link';
import { ArrowRight, Headphones, Music4 } from 'lucide-react';
import { APP_BRAND } from '@bingo/shared';

/** Portada del cartón de muestra: dos casillas ya marcadas. */
const SLEEVE_TRACKS = [
  'Viva la Vida',
  'Flowers',
  'La Bachata',
  'Libre',
  'As It Was',
  'DESPECHÁ',
  'Titanium',
  'Blinding Lights',
  'Todo de Ti',
];
const SLEEVE_MARKED = [4, 7];

/*
 * Los tres pasos de montar una partida, en el orden en que ocurren. Las
 * etiquetas recogen el rótulo para que la tira se lea como su desarrollo y no
 * como tres datos sueltos.
 */
const CREDITS = [
  {
    label: 'Tu música',
    text: 'Empieza con la colección de muestra o importa cualquier lista pública de Spotify.',
  },
  {
    label: 'Su móvil',
    text: 'Entran con el código o el QR. Nada que instalar, ninguna cuenta que crear.',
  },
  {
    label: 'Vuestro juego',
    text: 'Bingo, quiz, adivina la canción, supervivencia o una mezcla de todo.',
  },
];

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-6xl flex-col px-5 py-6 sm:px-8">
      <nav className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 font-display text-lg tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-slate-900 bg-brand-600 text-slate-50 dark:border-slate-100">
            <Music4 className="h-4 w-4" aria-hidden />
          </span>
          {APP_BRAND.name}
        </Link>
        <Link
          href="/login"
          className="font-mono text-xs uppercase tracking-[0.14em] text-slate-500 underline-offset-4 hover:text-brand-600 hover:underline dark:text-slate-400"
        >
          Acceder
        </Link>
      </nav>

      <div className="grid flex-1 items-center gap-14 py-14 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 lg:py-20">
        <section>
          <p className="eyebrow">Juegos musicales en directo</p>
          <h1 className="mt-5 font-display text-[2.6rem] leading-[0.92] tracking-[-0.03em] sm:text-[3.4rem] lg:text-[3.9rem]">
            Tu música.
            <br />
            <span className="text-brand-600 dark:text-brand-400">Vuestro</span>
            <br />
            juego.
          </h1>
          <p className="mt-6 max-w-md text-pretty text-lg leading-8 text-slate-600 dark:text-slate-300">
            Pon la música, comparte un código de seis letras y que cada móvil sea un mando. Sin
            instalar nada y sin cuenta para quien juega.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/register" className="btn-primary sm:w-auto">
              Crear partida
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/join" className="btn-secondary sm:w-auto">
              <Headphones className="h-4 w-4" aria-hidden />
              Entrar con código
            </Link>
          </div>

          <dl className="mt-12 grid gap-5 border-t-2 border-slate-900 pt-6 dark:border-slate-700 sm:grid-cols-3">
            {CREDITS.map((credit) => (
              <div key={credit.label}>
                <dt className="font-mono text-xs uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
                  {credit.label}
                </dt>
                <dd className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {credit.text}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/*
         * Firma: el disco saliendo de la funda. La portada es un cartón real,
         * que es exactamente lo que recibe cada jugador.
         */}
        <section className="relative mx-auto w-full max-w-lg" aria-label="Vista previa del juego">
          <div className="relative pr-[30%]">
            {/*
             * El giro va en un hijo: `animate-spin-record` escribe `transform`
             * y borraría el centrado vertical si compartieran elemento.
             */}
            <div className="absolute left-[46%] top-1/2 w-[54%] -translate-y-1/2">
              <div className="vinyl animate-spin-record w-full" aria-hidden />
            </div>
            <div className="card relative z-10 p-4 shadow-sleeve-lg sm:p-5">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    Sala <span className="data text-slate-900 dark:text-slate-100">BAILA</span>
                  </p>
                  <p className="mt-0.5 font-display text-xl leading-tight">Hits para cantar</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-brand-600 dark:text-brand-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-600 dark:bg-brand-400" />
                  En directo
                </span>
              </div>

              {/* La carátula va enmarcada dentro de la funda, como una lámina pegada */}
              <div className="rounded border-2 border-slate-900 bg-slate-100 p-2 dark:border-slate-700 dark:bg-slate-950">
                <div className="grid grid-cols-3 gap-1.5">
                  {SLEEVE_TRACKS.map((track, index) => (
                    <div
                      key={track}
                      className={`flex aspect-square items-center justify-center rounded border-2 p-1.5 text-center text-[11px] font-semibold leading-tight ${
                        SLEEVE_MARKED.includes(index)
                          ? 'border-emerald-500 bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100'
                          : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {track}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <span className="btn-secondary pointer-events-none w-full">¡Línea!</span>
                <span className="btn-primary pointer-events-none w-full">¡Bingo!</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
