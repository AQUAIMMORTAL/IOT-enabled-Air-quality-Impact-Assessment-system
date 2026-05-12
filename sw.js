// ══════════════════════════════════════════════════════════════════
//  sw.js — Aeromatrics Service Worker
//  Cache strategy: Cache-First for static assets,
//                  Network-First for API calls (always fresh AQI data)
// ══════════════════════════════════════════════════════════════════

const CACHE_NAME    = 'aeromatrics-v1';
const STATIC_ASSETS = [
  './index.html',
  './config.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// ── INSTALL — pre-cache all static assets ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())   // activate immediately
  );
});

// ── ACTIVATE — delete old cache versions ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())  // take control immediately
  );
});

// ── FETCH — smart routing ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Always go network-first for AQI API calls — stale air data is dangerous
  const isApiCall =
    url.hostname.includes('waqi.info')        ||
    url.hostname.includes('aqicn.org')        ||
    url.hostname.includes('iqair.com')        ||
    url.hostname.includes('openaq.org')       ||
    url.hostname.includes('airquality.googleapis.com') ||
    url.hostname.includes('open-meteo.com')   ||
    url.hostname.includes('power.larc.nasa.gov') ||
    url.hostname.includes('api.windy.com')    ||
    url.hostname.includes('embed.windy.com');

  if (isApiCall) {
    // Network-first: try live data, fall back to nothing (don't cache API responses)
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // Map tiles & CDN — cache-first (tiles don't change)
  const isTile =
    url.hostname.includes('cartocdn.com') ||
    url.hostname.includes('openstreetmap.org') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com');

  if (isTile) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200) return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
    return;
  }

  // Static assets — cache-first, update in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
      return cached || fetchPromise;
    })
  );
});
