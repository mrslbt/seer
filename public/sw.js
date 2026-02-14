/**
 * The Seer — Service Worker
 *
 * Strategy: cache the app shell (HTML, CSS, JS, fonts, icons)
 * for instant loads. API calls and ephemeris data are network-only.
 */

const CACHE_NAME = 'seer-v1';

// App shell files to pre-cache on install
const SHELL_FILES = [
  '/',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
];

// Patterns that should NEVER be cached
const NEVER_CACHE = [
  '/api/',          // Oracle API calls — must be fresh
  '/wsam/',         // Swiss Ephemeris WASM (12MB, too large)
  'posthog',        // Analytics
  'cloudflareinsights', // CF analytics
  'sentry',         // Error tracking
];

function shouldCache(url) {
  return !NEVER_CACHE.some(pattern => url.includes(pattern));
}

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL_FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch — network-first for everything, fall back to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip URLs that should never be cached
  if (!shouldCache(request.url)) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Cache successful responses for next time
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(request).then(cached => {
          if (cached) return cached;

          // If the request is for navigation, return the cached index
          if (request.mode === 'navigate') {
            return caches.match('/');
          }

          // Nothing in cache either
          return new Response('Offline', { status: 503, statusText: 'Offline' });
        });
      })
  );
});
