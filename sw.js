const CACHE_NAME = 'al-saadi-khata-v1';
const STATIC_CACHE = 'al-saadi-khata-static-v1';
const DYNAMIC_CACHE = 'al-saadi-khata-dynamic-v1';

// Files to cache immediately
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/admin-login.html',
    '/admin/index.html',
    '/styles.css',
    '/auth.css',
    '/admin/admin.css',
    '/app.js',
    '/admin/admin.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png'
];

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .catch(err => console.log('Service Worker: Caching failed', err))
    );
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== STATIC_CACHE && cache !== DYNAMIC_CACHE) {
                        console.log('Service Worker: Deleting old cache', cache);
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
    // Skip non-GET requests and API calls
    if (event.request.method !== 'GET' ||
        event.request.url.includes('/api/') ||
        event.request.url.includes('chrome-extension://')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if found
                if (response) {
                    return response;
                }

                // Otherwise fetch from network
                return fetch(event.request)
                    .then(networkResponse => {
                        // Don't cache if response is not ok
                        if (!networkResponse.ok) {
                            return networkResponse;
                        }

                        // Clone the response for caching
                        const responseClone = networkResponse.clone();

                        // Cache the response
                        caches.open(DYNAMIC_CACHE)
                            .then(cache => {
                                cache.put(event.request, responseClone);
                            });

                        return networkResponse;
                    })
                    .catch(() => {
                        // Return offline fallback if available
                        if (event.request.destination === 'document') {
                            return caches.match('/index.html');
                        }
                    });
            })
    );
});