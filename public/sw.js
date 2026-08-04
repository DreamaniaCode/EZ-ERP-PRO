const CACHE_NAME = 'easyerp-pwa-v4';
const STATIC_CACHE_NAME = 'easyerp-static-v4';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/ez_erp_logo.jpg'
];


// Install Event - Pre-cache core shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log('[PWA SW] Pre-caching core app shell');
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== STATIC_CACHE_NAME) {
            console.log('[PWA SW] Removing old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with cache fallback for HTML, Cache first / Stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Ignore non-GET requests or browser extension requests
  if (request.method !== 'GET' || !request.url.startsWith('http')) return;

  // Handle SPA navigation requests (HTML pages)
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          console.log('[PWA SW] Offline navigation - serving cached index.html');
          return caches.match('/index.html').then((cachedIndex) => {
            return cachedIndex || caches.match('/');
          });
        })
    );
    return;
  }

  // Handle static assets (js, css, images, fonts, svg)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const copy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => {
          // If network fails and asset is not in cache, try index.html as fallback for SPA
          return cachedResponse;
        });

      // Return cached response immediately if present (Stale-While-Revalidate), otherwise wait for network
      return cachedResponse || fetchPromise;
    })
  );
});
