/* ═══════════════════════════════════════════════════════════════
   TickGas Admin — Service Worker
   Enables PWA installability and offline shell caching.
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'tickgas-admin-v1';

const SHELL_ASSETS = [
  '/index.html',
  '/dashboard.html',
  '/suppliers.html',
  '/agents.html',
  '/orders.html',
  '/payments.html',
  '/analytics.html',
  '/locations.html',
  '/profile.html',
  '/login.html',
  '/manifest.json',
  '/css/main.css',
  '/css/admin.css',
  '/css/auth.css',
  '/js/api.js',
  '/js/sidebar.js',
  '/js/suppliers.js',
  '/icons/favicon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-512x512-maskable.png',
  '/icons/apple-touch-icon.png',
];

// ── Install: pre-cache shell assets.
//    Use Promise.allSettled so a single 404 does NOT abort the install.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache =>
        Promise.allSettled(
          SHELL_ASSETS.map(url =>
            fetch(url)
              .then(res => { if (res.ok) cache.put(url, res); })
              .catch(() => { /* skip missing asset */ })
          )
        )
      )
      .then(() => self.skipWaiting())   // skipWaiting inside waitUntil chain
  );
});

// ── Activate: delete stale caches, claim clients immediately.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch strategy:
//    /api/*  → network-only  (never serve stale auth / data responses)
//    rest    → network-first, fall back to cache for offline resilience
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only intercept GET requests
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Network-only for API routes
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(
          JSON.stringify({ error: 'Offline — no network available' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  // Network-first for everything else
  event.respondWith(
    fetch(request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
