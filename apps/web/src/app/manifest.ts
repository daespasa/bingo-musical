import type { MetadataRoute } from 'next';
import { APP_BRAND } from '@bingo/shared';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_BRAND.name,
    short_name: APP_BRAND.shortName,
    description: APP_BRAND.longDescription,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#100e0c',
    theme_color: '#cf3a00',
    lang: 'es',
    categories: ['games', 'music', 'entertainment'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Unirme a una partida', url: '/join' },
      { name: 'Mis partidas', url: '/dashboard' },
    ],
  };
}
