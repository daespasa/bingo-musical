'use client';

import { useEffect, useState } from 'react';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import {
  applyTheme,
  readStoredPreference,
  resolveTheme,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from '@/lib/theme';

const OPCIONES: Array<{ valor: ThemePreference; etiqueta: string; Icono: LucideIcon }> = [
  { valor: 'light', etiqueta: 'Claro', Icono: Sun },
  { valor: 'dark', etiqueta: 'Oscuro', Icono: Moon },
  { valor: 'system', etiqueta: 'Automático', Icono: Monitor },
];

function sistemaPrefiereOscuro(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/**
 * Selector de tema con tres estados. El activo solo se marca tras montarse:
 * el servidor no sabe qué hay en `localStorage`, así que renderizar un estado
 * marcado en el primer paso discreparía del cliente y dispararía el aviso de
 * hidratación (la Tarea 2 ya resuelve el fogonazo con un script inline; este
 * componente solo refleja esa decisión, no la repite).
 */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const [preferencia, setPreferencia] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setPreferencia(readStoredPreference());

    // En «automático» el tema sigue al sistema sin recargar: se escucha el
    // cambio y, si la preferencia activa sigue siendo «system», se reaplica.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      setPreferencia((actual) => {
        if (actual === 'system') {
          applyTheme(resolveTheme('system', media.matches));
        }
        return actual;
      });
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  const elegir = (valor: ThemePreference) => {
    setPreferencia(valor);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, valor);
    } catch {
      // Modo privado u otro bloqueo: el tema se aplica igual para esta
      // visita, solo no sobrevive a recargar (mismo criterio que readStoredPreference).
    }
    applyTheme(resolveTheme(valor, sistemaPrefiereOscuro()));
  };

  const activa = OPCIONES.find((opcion) => opcion.valor === preferencia);
  const nombreGrupo = activa ? `Tema: ${activa.etiqueta}` : 'Tema';

  return (
    <div
      role="group"
      aria-label={nombreGrupo}
      className={`inline-flex items-center overflow-hidden rounded-md border-2 border-slate-900 dark:border-slate-100 ${className}`.trim()}
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }, index) => (
        <button
          key={valor}
          type="button"
          aria-label={etiqueta}
          aria-pressed={preferencia === valor}
          onClick={() => elegir(valor)}
          className={`flex h-9 w-9 items-center justify-center transition-colors ${
            index > 0 ? 'border-l-2 border-slate-900 dark:border-slate-100' : ''
          } ${
            preferencia === valor
              ? 'bg-brand-600 text-slate-50'
              : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
        >
          <Icono className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
