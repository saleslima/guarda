const CACHE_NAME = 'escala-2025-v5';
const STATIC_CACHE_NAME = 'escala-static-v5';
const DYNAMIC_CACHE_NAME = 'escala-dynamic-v5';

// Static resources that should always be cached
const staticResources = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.json',
  '/copom-logo.png',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

// Install event - cache static resources
self.addEventListener('install', function(event) {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE_NAME).then(function(cache) {
        console.log('Service Worker: Caching static files');
        return cache.addAll(staticResources);
      }),
      caches.open(DYNAMIC_CACHE_NAME).then(function(cache) {
        console.log('Service Worker: Dynamic cache ready');
        return Promise.resolve();
      })
    ]).then(() => {
      console.log('Service Worker: Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== STATIC_CACHE_NAME && 
              cacheName !== DYNAMIC_CACHE_NAME && 
              cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then(function(response) {
      // Return cached version if available
      if (response) {
        console.log('Service Worker: Serving from cache:', event.request.url);
        return response;
      }
      
      // Otherwise, fetch from network and cache dynamic content
      console.log('Service Worker: Fetching from network:', event.request.url);
      return fetch(event.request).then(function(response) {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response
        var responseToCache = response.clone();
        
        // Cache dynamic content
        caches.open(DYNAMIC_CACHE_NAME).then(function(cache) {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      }).catch(function(error) {
        console.log('Service Worker: Network fetch failed:', error);
        // If both cache and network fail, return offline page for navigation requests
        if (event.request.destination === 'document') {
          return caches.match('/index.html');
        }
        // For other requests, you might want to return a default response
        return new Response('Offline - Content not available', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      });
    })
  );
});

// Background sync for future data synchronization
self.addEventListener('sync', function(event) {
  console.log('Service Worker: Background sync event:', event.tag);
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Future implementation for syncing data when online
      Promise.resolve()
    );
  }
});

// Message handling for manual cache updates
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});