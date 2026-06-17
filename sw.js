/**
 * Buddyz Quiz — sw.js (Service Worker) v1.0
 * Feature ⑥: PWA Push Notifications
 *
 * Handles:
 *  - Static asset caching for offline-first performance
 *  - Push notification display when Firebase triggers via backend
 *  - Notification click routing back to the quiz dashboard
 *
 * Deploy this file at your SITE ROOT (same level as index.html).
 * The registration in quiz.js does: navigator.serviceWorker.register('/sw.js')
 */

const CACHE_NAME     = 'buddyz-v4';
const STATIC_ASSETS  = [
  '/',
  '/index.html',
  '/styles.css',
  '/quiz.js',
  '/home.js',
  /* Font Awesome and Firebase are CDN — skip caching them here.
     bffchallenge.html is now just a tiny redirect shim for old
     shared links, not the main quiz shell — no need to precache it. */
];

/* ── INSTALL: pre-cache static shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS).catch(err => {
        /* Non-fatal: some files may not exist in dev; continue anyway */
        console.warn('[Buddyz SW] Pre-cache partial failure:', err);
      });
    })
  );
  self.skipWaiting();
});

/* ── ACTIVATE: remove old caches ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ── FETCH: network-first, cache fallback ── */
self.addEventListener('fetch', event => {
  /* Only cache same-origin GET requests */
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        /* Clone and store in cache */
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ── PUSH: display notification ──
   Payload shape expected from your backend/Firebase Cloud Function:
   {
     "title": "🔥 New Score on Your Quiz!",
     "body": "Alex just scored 11/15 on your Buddyz quiz. See who's winning!",
     "quizId": "Xk8mZ2pQ",
     "icon": "/icon-192.png",
     "badge": "/badge-72.png"
   }
*/
self.addEventListener('push', event => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: '🔥 Buddyz — New Activity!',
      body:  'Someone just took your quiz. Check the leaderboard!',
    };
  }

  const title   = data.title   || '🔥 Buddyz';
  const options = {
    body:    data.body    || 'Someone took your Buddyz quiz!',
    icon:    data.icon    || '/icon-192.png',
    badge:   data.badge   || '/badge-72.png',
    tag:     'buddyz-score',          /* collapses multiple into one notification */
    renotify: true,
    data: {
      quizId: data.quizId || '',
      url:    self.registration.scope + 'index.html',
    },
    actions: [
      { action: 'view', title: 'See Leaderboard', icon: '/icon-72.png' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

/* ── NOTIFICATION CLICK: route to dashboard ── */
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetURL = event.notification.data?.url || (self.registration.scope + 'index.html');

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      /* Focus an existing window if one is already open */
      for (const client of windowClients) {
        if (client.url === targetURL && 'focus' in client) {
          return client.focus();
        }
      }
      /* Otherwise open a new tab */
      if (clients.openWindow) return clients.openWindow(targetURL);
    })
  );
});
