/* Cuaderno los Nazco — Safe Static App-Shell Service Worker
 * Security rule: NEVER caches private user posts, messages, credentials, or user photos.
 * Only caches public shell assets, crochet textures, icons, and offline fallback page.
 */
const CACHE_NAME = 'los-nazco-shell-v5';
const STATIC_ASSETS = [
  './offline.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './crochet/cotton-cream-weave.webp',
  './crochet/crochet-green-knit.webp',
  './crochet/crochet-gold-knit.webp',
  './crochet/crochet-burlap-card.webp',
  './crochet/crochet-blue-knit.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./offline.html'))
    );
    return;
  }

  const isSafeStatic =
    url.pathname.includes('/crochet/') ||
    url.pathname.includes('/icons/') ||
    url.pathname.endsWith('/manifest.webmanifest') ||
    url.pathname.endsWith('/offline.html');

  if (isSafeStatic) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        });
      })
    );
  }
});
