import Link from 'next/link';
import { Music4 } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/70 backdrop-blur dark:border-slate-800 dark:bg-slate-950/70">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-black">
              <Music4 className="h-5 w-5 text-brand-500" aria-hidden />
              Bingo Musical
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300"
            >
              Partidas
            </Link>
            <Link
              href="/dashboard/music"
              className="text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300"
            >
              Música
            </Link>
            <Link
              href="/dashboard/history"
              className="text-sm text-slate-600 hover:text-brand-600 dark:text-slate-300"
            >
              Historial
            </Link>
          </nav>
          <UserMenu />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
