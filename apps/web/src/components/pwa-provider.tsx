'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { APP_BRAND } from '@bingo/shared';

/** Evento no estándar de Chromium para instalación de PWA. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

const DISMISSED_KEY = 'bingo:install-dismissed';

/**
 * Registra el service worker y ofrece instalar la aplicación cuando el
 * navegador lo permite. En iOS no existe el evento, así que ahí la
 * instalación se hace desde «Compartir → Añadir a pantalla de inicio».
 */
export function PwaProvider() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY) === '1') return;
      setInstallEvent(event as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => setVisible(false);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !installEvent) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === 'dismissed') localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="animate-toast fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md border-2 border-slate-900 bg-slate-50 p-3 shadow-sleeve dark:border-slate-100 dark:bg-slate-900">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Instalar {APP_BRAND.name}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Añádelo a tu pantalla de inicio para jugar a pantalla completa.
        </p>
      </div>
      <button onClick={install} className="btn-primary shrink-0 px-3 py-2 text-xs">
        <Download className="h-3.5 w-3.5" aria-hidden />
        Instalar
      </button>
      <button
        onClick={dismiss}
        aria-label="Ahora no"
        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
