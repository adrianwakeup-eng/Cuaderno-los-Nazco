/* Cuaderno Social de la Familia — Safe Static App-Shell + Real Web Push Service Worker (v6)
 * Security rule: NEVER caches private user posts, messages, credentials, or user photos.
 * Handles Web Push notifications for incoming calls & messages even when app is closed.
 */
const CACHE_NAME = 'los-nazco-shell-v20';
const PUSH_ENDPOINT_URL = 'https://yqhcyjrmkibhoorziqvg.supabase.co/functions/v1/nazco-push-notify';
const dismissedCallIds = new Set();
const STATIC_ASSETS = [
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/badge-96.png',
  './icons/notif-circle-192.png',
  './textures/metallic-gold-bg.webp',
  './textures/earth-day.webp',
  './textures/earth-clouds.webp',
  './textures/sunflower/head.webp',
  './textures/sunflower/leaf-left.webp',
  './textures/sunflower/leaf-right.webp',
  './textures/sunflower/stem.webp',
  './textures/sunflower/bee-body.webp',
  './textures/sunflower/bee-wing.webp',
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
      .then(async (cache) => {
        await cache.add('./offline.html');
        await Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
      })
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k.startsWith('los-nazco-shell-') && k !== CACHE_NAME).map((k) => caches.delete(k)))
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
      fetch(request).catch(async () => {
        const offline = await caches.match(new URL('./offline.html', self.registration.scope));
        return offline || new Response('Cuaderno Social de la Familia · Sin conexión', {
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
      })
    );
    return;
  }

  const isSafeStatic =
    url.pathname.includes('/crochet/') ||
    url.pathname.includes('/crochet-assets/') ||
    url.pathname.includes('/textures/') ||
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
    title: 'Cuaderno Social de la Familia',
    body: 'Tienes una notificación familiar 💛',
    url: './',
    tag: 'nazco-general',
    kind: 'MESSAGE',
    roomCode: '',
    callMode: 'VIDEO',
    callId: '',
    callerId: '',
    callerName: '',
    iconUrl: '',
    declineSig: '',
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text() || payload.body;
    }
  }

  const isCall = payload.kind === 'CALL';
  const isCancel = payload.kind === 'CALL_CANCEL';
  const baseScope = self.registration.scope || './';

  const resolvedIcon =
    typeof payload.iconUrl === 'string' && payload.iconUrl.startsWith('https://')
      ? payload.iconUrl
      : new URL('./icons/notif-circle-192.png', baseScope).toString();
  const badgeUrl = new URL('./icons/badge-96.png', baseScope).toString();

  // Caller hung up before receiver answered: stop ringing alert & replace with quiet missed-call notice
  if (isCancel) {
    const callTag = payload.roomCode ? `nazco-call-${payload.roomCode}` : payload.tag;
    if (payload.callId) dismissedCallIds.add(payload.callId);
    event.waitUntil(
      self.registration.getNotifications({ tag: callTag }).then((list) => {
        list.forEach((n) => n.close());
        return self.registration.showNotification(payload.title || '📵 Llamada perdida', {
          body: payload.body || 'Te llamaron en Cuaderno Social de la Familia',
          icon: resolvedIcon,
          badge: badgeUrl,
          tag: `nazco-missed-${payload.callId || payload.roomCode || Date.now()}`,
          silent: true,
          renotify: false,
          requireInteraction: false,
          data: { url: baseScope, kind: 'CALL_CANCEL' },
        });
      })
    );
    return;
  }

  // Incoming call pulse: repeats every ~4.5s until answered or hung up
  if (isCall) {
    if (payload.callId && dismissedCallIds.has(payload.callId)) {
      return;
    }

    let targetUrl = payload.url || baseScope;
    if (payload.roomCode) {
      const u = new URL(baseScope);
      u.searchParams.set('incomingCall', payload.roomCode);
      u.searchParams.set('mode', payload.callMode || 'VIDEO');
      if (payload.callId) u.searchParams.set('callId', payload.callId);
      if (payload.callerId) u.searchParams.set('callerId', payload.callerId);
      if (payload.callerName) u.searchParams.set('callerName', payload.callerName);
      u.searchParams.set('title', payload.title || 'Llamada familiar');
      targetUrl = u.toString();
    }

    const callTag = payload.roomCode ? `nazco-call-${payload.roomCode}` : payload.tag || 'nazco-call';

    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        // If user already has the app visibly open on screen, the in-app IncomingCallModal is already ringing!
        const hasVisibleApp = clients.some(
          (c) => c.url.startsWith(baseScope) && c.visibilityState === 'visible'
        );
        if (hasVisibleApp) {
          return self.registration.getNotifications({ tag: callTag }).then((list) => {
            list.forEach((n) => n.close());
          });
        }

        return self.registration.showNotification(payload.title, {
          body: payload.body,
          icon: resolvedIcon,
          badge: badgeUrl,
          tag: callTag,
          renotify: true,
          requireInteraction: true,
          vibrate: [500, 220, 500, 220, 500, 220, 500],
          data: {
            url: targetUrl,
            kind: 'CALL',
            roomCode: payload.roomCode,
            callMode: payload.callMode,
            callId: payload.callId,
            declineSig: payload.declineSig,
          },
          actions: [
            { action: 'answer', title: '✅ Contestar' },
            { action: 'dismiss', title: '❌ Colgar' },
          ],
        });
      })
    );
    return;
  }

  // Regular MESSAGE / TEST notification: grouped per chatId, rings once per new message
  const isMessage = payload.kind === 'MESSAGE';
  const chatId = typeof payload.chatId === 'string' ? payload.chatId : '';
  const messageKind = typeof payload.messageKind === 'string' ? payload.messageKind : 'TEXT';
  let targetUrl = payload.url || baseScope;
  if (isMessage && chatId) {
    try {
      const u = new URL(targetUrl, baseScope);
      u.searchParams.set('section', 'MESSAGES');
      u.searchParams.set('chatId', chatId);
      if (messageKind) u.searchParams.set('msgKind', messageKind);
      targetUrl = u.toString();
    } catch {
      // keep fallback targetUrl
    }
  }
  const messageActions = isMessage
    ? [{ action: 'reply', title: '💬 Responder' }, { action: 'open', title: 'Ver conversación' }]
    : [{ action: 'open', title: '💬 Abrir' }];
  const safeThumb =
    typeof payload.imageUrl === 'string' && payload.imageUrl.startsWith('https://')
      ? payload.imageUrl
      : typeof payload.thumbnailUrl === 'string' && payload.thumbnailUrl.startsWith('https://')
        ? payload.thumbnailUrl
        : '';
  const groupedTag = payload.tag || (isMessage && chatId ? `nazco-chat-${chatId}` : `nazco-msg-${Date.now()}`);
  const notifOptions = {
    body: payload.body,
    icon: resolvedIcon,
    badge: badgeUrl,
    tag: groupedTag,
    renotify: Boolean(isMessage && chatId),
    requireInteraction: false,
    vibrate: [180, 80, 180],
    data: {
      url: targetUrl,
      kind: payload.kind,
      chatId,
      messageKind,
    },
    actions: messageActions,
  };
  if (safeThumb && (messageKind === 'IMAGE' || messageKind === 'VIDEO')) {
    notifOptions.image = safeThumb;
  }
  event.waitUntil(self.registration.showNotification(payload.title, notifOptions));
});

self.addEventListener('notificationclick', (event) => {
  const notifData = event.notification.data || {};
  event.notification.close();

  // Tapping "❌ Colgar" directly on the lock-screen notification ends the call immediately!
  if (event.action === 'dismiss') {
    if (notifData.callId) {
      dismissedCallIds.add(notifData.callId);
      if (notifData.declineSig) {
        event.waitUntil(
          fetch(PUSH_ENDPOINT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'decline_call',
              callId: notifData.callId,
              declineSig: notifData.declineSig,
            }),
          }).catch(() => {})
        );
      }
    }
    return;
  }

  if (notifData.callId) {
    dismissedCallIds.add(notifData.callId);
  }

  let targetUrl = notifData.url || self.registration.scope || './';

  // Only auto-answer if user explicitly tapped the "✅ Contestar" action button;
  // tapping the notification body opens the Contestar / Colgar screen first!
  if (event.action === 'answer' && targetUrl.includes('incomingCall=')) {
    const u = new URL(targetUrl);
    u.searchParams.set('autoAnswer', '1');
    targetUrl = u.toString();
  }

  const isMessageClick = notifData.kind === 'MESSAGE';
  const wantsReplyFocus = isMessageClick && event.action === 'reply';
  if (isMessageClick) {
    try {
      const u = new URL(targetUrl, self.registration.scope);
      u.searchParams.set('section', 'MESSAGES');
      if (notifData.chatId) u.searchParams.set('chatId', notifData.chatId);
      if (notifData.messageKind) u.searchParams.set('msgKind', notifData.messageKind);
      if (wantsReplyFocus) u.searchParams.set('focusReply', '1');
      targetUrl = u.toString();
    } catch {
      // keep targetUrl
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.startsWith(self.registration.scope)) {
          if ('navigate' in client && (targetUrl.includes('incomingCall=') || new URL(targetUrl, self.registration.scope).searchParams.get('editarUbicacion') === '1')) {
            return client.navigate(targetUrl).then((c) => c?.focus());
          }
          if (isMessageClick) {
            if ('postMessage' in client && notifData.chatId) {
              client.postMessage({
                type: 'OPEN_CHAT',
                chatId: notifData.chatId,
                focusReply: wantsReplyFocus,
                messageKind: notifData.messageKind || 'TEXT',
              });
              return client.focus();
            }
            if ('navigate' in client) {
              return client.navigate(targetUrl).then((c) => c?.focus());
            }
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
