const CACHE_NAME = 'easyerp-pwa-v13-real-name';




// Install Event - Force immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate Event - PURGE ALL OLD CACHES IMMEDIATELY
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[PWA SW] Purging old cache:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Always prefer fresh network responses, fallback to cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET or browser extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

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
