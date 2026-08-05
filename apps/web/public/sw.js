/**
 * Service worker del bingo musical.
 *
 * Estrategia deliberadamente conservadora: el juego es en tiempo real, así
 * que NUNCA servimos respuestas de la API ni del WebSocket desde caché.
 * Solo cacheamos estáticos y los fragmentos de audio demo (inmutables), y
 * mostramos una página offline cuando falla una navegación.
 */
const VERSION = 'v1';
const STATIC_CACHE = `bingo-static-${VERSION}`;
const AUDIO_CACHE = `bingo-audio-${VERSION}`;
const OFFLINE_URL = '/offline';

const PRECACHE = ['/', '/join', OFFLINE_URL, '/icons/icon-192.png', '/icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('bingo-') && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Todo lo que no sea nuestro origen (API, CDN de previews) va directo a red
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) return;

  // Audio demo: inmutable, cache-first para que la ronda no dependa de la red
  if (url.pathname.startsWith('/audio/')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  // Navegaciones: red primero para no servir estado de partida obsoleto
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(STATIC_CACHE);
        return (await cache.match(OFFLINE_URL)) ?? Response.error();
      }),
    );
    return;
  }

  // Estáticos de Next: stale-while-revalidate
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => hit);
        return hit ?? network;
      }),
    );
  }
});
