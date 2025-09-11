const CACHE_NAME = 'ebook-viewer-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/viewer.js',
    '/manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs',
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs'
];

self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[Service Worker] Cache addAll failed:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    // Only cache GET requests
    if (event.request.method !== 'GET') {
        console.log('[Service Worker] Skipping non-GET request:', event.request.url);
        return;
    }

    // Handle requests for PDF files
    if (event.request.url.startsWith(self.location.origin + '/ebooks/')) {
        console.log('[Service Worker] Handling PDF request:', event.request.url);
        event.respondWith(
            caches.match(event.request).then(response => {
                // Return cached response if found
                if (response) {
                    console.log('[Service Worker] Serving PDF from cache:', event.request.url);
                    return response;
                }
                // Otherwise, fetch from network, cache, and return
                console.log('[Service Worker] Fetching PDF from network:', event.request.url);
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        console.warn('[Service Worker] Not caching non-200 or non-basic response for PDF:', event.request.url, networkResponse.status, networkResponse.type);
                        return networkResponse;
                    }
                    return caches.open(CACHE_NAME).then(cache => {
                        console.log('[Service Worker] Caching new PDF:', event.request.url);
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                }).catch(error => {
                    console.error('[Service Worker] Network fetch for PDF failed:', event.request.url, error);
                    // Fallback for offline if PDF is not in cache and network fails
                    return new Response('<h1>Offline PDF not available</h1><p>Please connect to the internet to view this PDF.</p>', { headers: { 'Content-Type': 'text/html' } });
                });
            })
        );
        return;
    }

    // For other static assets, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    console.log('[Service Worker] Serving static asset from cache:', event.request.url);
                    return response;
                }
                console.log('[Service Worker] Fetching static asset from network:', event.request.url);
                return fetch(event.request).then(networkResponse => {
                    if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                        console.warn('[Service Worker] Not caching non-200 or non-basic response for static asset:', event.request.url, networkResponse.status, networkResponse.type);
                        return networkResponse;
                    }
                    return caches.open(CACHE_NAME).then(cache => {
                        console.log('[Service Worker] Caching new static asset:', event.request.url);
                        cache.put(event.request, networkResponse.clone());
                        return networkResponse;
                    });
                });
            })
            .catch(error => {
                console.error('[Service Worker] Fetch for static asset failed:', event.request.url, error);
                // You might want a generic offline page here
                return new Response('<h1>Offline</h1><p>You are offline and this page is not in cache.</p>', { headers: { 'Content-Type': 'text/html' } });
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});