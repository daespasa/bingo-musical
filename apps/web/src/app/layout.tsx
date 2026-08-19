import type { Metadata, Viewport } from 'next';
import { APP_BRAND } from '@bingo/shared';
import { Archivo, Archivo_Black, DM_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { PwaProvider } from '@/components/pwa-provider';

/**
 * Tipografía de funda de disco: una grotesca negra para los rótulos, su misma
 * familia en pesos normales para el texto y una monoespaciada para todo lo que
 * es dato (códigos de sala, tiempos, puntuaciones). `next/font` las descarga
 * al compilar y las sirve desde el propio dominio, sin peticiones externas.
 */
const display = Archivo_Black({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Archivo({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const mono = DM_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: APP_BRAND.name,
  description: APP_BRAND.longDescription,
  applicationName: APP_BRAND.name,
  appleWebApp: {
    capable: true,
    title: APP_BRAND.shortName,
    statusBarStyle: 'black-translucent',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#cf3a00' },
    { media: '(prefers-color-scheme: dark)', color: '#100e0c' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        <script
          // Corre antes del primer pintado: sin esto, quien tenga el tema
          // oscuro guardado ve un fogonazo blanco en cada carga. Es el único
          // código que no puede esperar a la hidratación, de ahí que vaya
          // inline y sin importar nada. La clave es la de `lib/theme.ts`.
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=localStorage.getItem('gramola:theme');var d=p==='dark'||((p===null||p==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
        <PwaProvider />
      </body>
    </html>
  );
}
