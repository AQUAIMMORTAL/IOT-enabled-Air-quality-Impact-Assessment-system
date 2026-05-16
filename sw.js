// ══════════════════════════════════════════════════════════════════
//  sw.js — Aeromatrics Service Worker
//  Cache strategy:
//    • index.html          → Network-first  (always fresh app shell)
//    • Your JS/config files → Network-first  (always fresh code)
//    • API calls           → Network-first  (live AQI data)
//    • Map tiles & CDN     → Cache-first    (static, rarely change)
//    • Icons / manifest    → Cache-first    (static assets)
//
//  Auto-update flow:
//    New deploy → browser detects changed sw.js → installs new SW
//    → skipWaiting() activates it immediately → old caches deleted
//    → SW posts UPDATE_AVAILABLE to all tabs → page reloads silently
// ══════════════════════════════════════════════════════════════════

// ⬆️  Bump this ONLY when you want to wipe tile/icon caches (rare).
//     Your app code (index.html, .js files) updates automatically
//     without touching this — they are always fetched from network.
const CACHE_NAME = 'aeromatrics-v3';

// Only truly static assets that never change belong here.
// DO NOT put index.html or your own .js files here — they must
// always be fetched fresh so users get the latest code instantly.
const PRECACHE_ASSETS = [
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
];

// Your own source files — always fetched from network, cached as
// fallback for offline use only.
const OWN_JS_FILES = [
  'config.js',
  'aero-assistant.js',
  'firebase-backend.js',
  'firebase-config.js',
];

// ── INSTALL — pre-cache only icons/manifest ────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())   // don't wait for old SW to die
  );
});

// ── ACTIVATE — wipe old caches, claim all tabs ────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
      // NOTE: We no longer postMessage here. By the time activate fires,
      // the page's message listener may not yet be attached (race condition).
      // Auto-reload is handled entirely in index.html via updatefound + skipWaiting.
  );
});

// ── MESSAGE — allow pages to trigger skipWaiting on demand ───────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH — smart routing ─────────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // ── 1. index.html — always network-first ────────────────────────
  //    This is the most important rule. Fresh HTML = fresh app.
  //    Falls back to cache only if completely offline.
  if (isSameOrigin && (url.pathname.endsWith('/') || url.pathname.endsWith('index.html'))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh copy for offline fallback
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ── 2. Your own JS/config files — network-first ─────────────────
  //    Always fetch latest code; cache only as offline fallback.
  const isOwnFile = isSameOrigin && OWN_JS_FILES.some(f => url.pathname.endsWith(f));
  if (isOwnFile) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // ── 3. AQI / weather APIs — network-first, no caching ───────────
  //    Stale air quality data is dangerous — never serve from cache.
  const isApiCall =
    url.hostname.includes('waqi.info')               ||
    url.hostname.includes('aqicn.org')               ||
    url.hostname.includes('iqair.com')               ||
    url.hostname.includes('openaq.org')              ||
    url.hostname.includes('airquality.googleapis.com') ||
    url.hostname.includes('open-meteo.com')          ||
    url.hostname.includes('power.larc.nasa.gov')     ||
    url.hostname.includes('api.windy.com')           ||
    url.hostname.includes('embed.windy.com');

  if (isApiCall) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(
        JSON.stringify({ error: 'offline' }),
        { headers: { 'Content-Type': 'application/json' } }
      ))
    );
    return;
  }

  // ── 4. Map tiles & CDN libraries — cache-first ──────────────────
  //    These never change for a given URL, safe to cache indefinitely.
  const isTileOrCDN =
    url.hostname.includes('cartocdn.com')        ||
    url.hostname.includes('openstreetmap.org')   ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('unpkg.com');

  if (isTileOrCDN) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── 5. Everything else (icons, manifest) — cache-first ──────────
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
