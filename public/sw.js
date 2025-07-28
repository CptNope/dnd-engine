// Service Worker for the DnD Engine PWA
//
// This service worker implements a simple cache‑first strategy.  When the
// application is installed it pre‑caches the core assets defined in
// `ASSETS`.  During fetch events it tries to serve requests from the
// cache first and falls back to the network if the resource is not in
// the cache.  You can extend this logic to cache additional assets
// dynamically or to implement more advanced strategies like stale‑while‑
// revalidate.

const CACHE_NAME = 'dnd-engine-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/main.js',
  '/js/engine/core.js',
  '/js/engine/modules/gameState.js',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    }),
  );
});

self.addEventListener('activate', (event) => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
    }),
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    }),
  );
});