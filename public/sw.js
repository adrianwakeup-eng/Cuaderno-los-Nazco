/* Cuaderno los Nazco — Safe Static App-Shell + Real Web Push Service Worker (v6)
 * Security rule: NEVER caches private user posts, messages, credentials, or user photos.
 * Handles Web Push notifications for incoming calls & messages even when app is closed.
 */
const CACHE_NAME = 'los-nazco-shell-v8';
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

/* ======================== REAL WEB PUSH (APP CLOSED / LOCK SCREEN) ======================== */

self.addEventListener('push', (event) => {
  let payload = {
    title: 'Cuaderno los Nazco',
    body: 'Tienes una notificación familiar 💛',
    url: './',
    tag: 'nazco-general',
    kind: 'MESSAGE',
    roomCode: '',
    callMode: 'VIDEO',
    callId: '',
    callerId: '',
    callerName: '',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const isCall = payload.kind === 'CALL';
  const baseScope = self.registration.scope || './';
  let targetUrl = payload.url || baseScope;
  if (isCall && payload.roomCode) {
    const u = new URL(baseScope);
    u.searchParams.set('incomingCall', payload.roomCode);
    u.searchParams.set('mode', payload.callMode || 'VIDEO');
    if (payload.callId) u.searchParams.set('callId', payload.callId);
    if (payload.callerId) u.searchParams.set('callerId', payload.callerId);
    if (payload.callerName) u.searchParams.set('callerName', payload.callerName);
    u.searchParams.set('title', payload.title || 'Llamada familiar');
    targetUrl = u.toString();
  }

  const options = {
    body: payload.body,
    icon: new URL('./icons/icon-192.png', baseScope).toString(),
    badge: new URL('./icons/icon-192.png', baseScope).toString(),
    tag: payload.tag || (isCall ? `nazco-call-${payload.roomCode}` : 'nazco-msg'),
    renotify: true,
    requireInteraction: isCall,
    vibrate: isCall ? [320, 140, 320, 140, 420, 140, 320] : [180, 80, 180],
    data: {
      url: targetUrl,
      kind: payload.kind,
      roomCode: payload.roomCode,
      callMode: payload.callMode,
    },
    actions: isCall
      ? [
          { action: 'answer', title: '✅ Contestar' },
          { action: 'dismiss', title: '❌ Colgar' },
        ]
      : [{ action: 'open', title: '💬 Abrir' }],
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;

  let targetUrl =
    (event.notification.data && event.notification.data.url) ||
    self.registration.scope ||
    './';

  // Only auto-answer if user explicitly tapped the "✅ Contestar" action button;
  // tapping the notification body opens the Contestar / Colgar screen first!
  if (event.action === 'answer' && targetUrl.includes('incomingCall=')) {
    const u = new URL(targetUrl);
    u.searchParams.set('autoAnswer', '1');
    targetUrl = u.toString();
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          if ('navigate' in client && targetUrl.includes('incomingCall=')) {
            return client.navigate(targetUrl).then((c) => c?.focus());
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
