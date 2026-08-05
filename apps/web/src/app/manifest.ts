import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Bingo Musical',
    short_name: 'Bingo Musical',
    description:
      'Bingo musical en tiempo real: reconoce la canción, marca tu cartón y canta línea o bingo.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0f172a',
    theme_color: '#9333ea',
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
