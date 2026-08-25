const CACHE_NAME = 'easyerp-pwa-v2026-live';

// Message Listener for client commands (Skip Waiting, Purge Caches)
self.addEventListener('message', (event) => {
  if (event.data) {
    if (event.data.type === 'SKIP_WAITING') {
      console.log('[PWA SW] Received SKIP_WAITING signal');
      self.skipWaiting();
    }
    if (event.data.type === 'CLEAR_CACHE') {
      console.log('[PWA SW] Received CLEAR_CACHE signal');
      caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      });
    }
  }
});

// Install Event - Force immediate activation
self.addEventListener('install', (event) => {
  console.log('[PWA SW] Installing Service Worker:', CACHE_NAME);
  self.skipWaiting();
});

// Activate Event - PURGE ALL OLD CACHES IMMEDIATELY & CLAIM CLIENTS
self.addEventListener('activate', (event) => {
  console.log('[PWA SW] Activating Service Worker:', CACHE_NAME);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[PWA SW] Purging obsolete cache:', cache);
            return caches.delete(cache);
          }
          return Promise.resolve();
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First with offline fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET or browser extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // Never cache API requests or version.json in Service Worker CacheStorage
  if (request.url.includes('/api/') || request.url.includes('version.json')) {
    return;
  }

  // Navigation / HTML requests - ALWAYS Network First with no-cache header!
  if (request.mode === 'navigate' || (request.headers.get('accept') && request.headers.get('accept').includes('text/html'))) {
    event.respondWith(
      fetch(request, { cache: 'no-cache' })
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(request).then((cached) => cached || caches.match('/index.html') || caches.match('/'));
        })
    );
    return;
  }

  // JS, CSS, Media - Network First with fallback to cache
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request);
      })
  );
});
