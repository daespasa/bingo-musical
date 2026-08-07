'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { History, LayoutGrid, Library } from 'lucide-react';

const SECTIONS = [
  { href: '/dashboard', label: 'Partidas', Icon: LayoutGrid },
  { href: '/dashboard/music', label: 'Música', Icon: Library },
  { href: '/dashboard/history', label: 'Historial', Icon: History },
];

/**
 * Secciones de la aplicación. La activa se marca con un canto grueso debajo y
 * el rótulo en negro: antes no había forma de saber dónde estabas.
 */
export function MainNav() {
  const pathname = usePathname();

  return (
    <nav className="flex min-w-0 items-center gap-1 sm:gap-2" aria-label="Secciones">
      {SECTIONS.map(({ href, label, Icon }) => {
        // `/dashboard` solo está activa en sí misma; el resto también en sus subpáginas
        const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'flex items-center gap-2 border-b-4 px-2 py-2 text-sm transition-colors sm:px-3',
              active
                ? 'border-brand-600 font-bold text-slate-900 dark:border-brand-400 dark:text-slate-50'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
            <span className="sr-only sm:hidden">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
