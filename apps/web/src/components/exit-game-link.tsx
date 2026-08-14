'use client';

import Link from 'next/link';
import { useIsAuthenticated } from '@/hooks/use-is-authenticated';

/**
 * Salida de una partida terminada. El destino depende de quién sale: quien
 * tiene cuenta vuelve a sus partidas; el invitado vuelve a la portada, que es
 * su sitio (desde ahí entra a otra sala con otro código).
 *
 * La etiqueta dice a dónde lleva a propósito: «Salir» a secas, en una página
 * que ofrece «Crear partida» y «Entrar con código», se lee como cerrar sesión.
 */
export function ExitGameLink({ className = '' }: { className?: string }) {
  const state = useIsAuthenticated();
  const classes = `btn-secondary ${className}`.trim();

  // Mientras no se sabe, no se apunta a ningún sitio: un enlace que cambia de
  // destino al resolverse la consulta se pulsa antes de tiempo.
  if (state === 'cargando') {
    return (
      <button type="button" className={classes} disabled>
        Salir
      </button>
    );
  }

  const authenticated = state === 'autenticado';
  return (
    <Link href={authenticated ? '/dashboard' : '/'} className={classes}>
      {authenticated ? 'Volver a mis partidas' : 'Salir'}
    </Link>
  );
}
