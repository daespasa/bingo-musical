import Link from 'next/link';
import { Music4 } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';
import { MainNav } from '@/components/main-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b-2 border-slate-900 bg-slate-50/95 backdrop-blur-md dark:border-slate-700 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 py-3 font-display sm:text-lg"
          >
            <span className="grid h-9 w-9 place-items-center rounded-md border-2 border-slate-900 bg-brand-600 text-slate-50 dark:border-slate-100">
              <Music4 className="h-4 w-4" aria-hidden />
            </span>
            <span className="hidden md:inline">Bingo Musical</span>
          </Link>

          {/* La navegación empuja al menú de cuenta al extremo derecho */}
          <MainNav />
          <div className="ml-auto shrink-0 py-2">
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
    </div>
  );
}
