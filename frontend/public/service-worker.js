/**
 * Finca Villa Luz - Service Worker
 * =================================
 * Estrategias de caché:
 * - Cache First: Para assets estáticos (CSS, JS, fuentes)
 * - Network First: Para datos de API
 * - Stale While Revalidate: Para datos que pueden ser stale
 * - Network Only: Para mutaciones (POST, PUT, DELETE)
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `images-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;

// Assets para precache (App Shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/assets/icon-192x192.png',
  '/assets/icon-512x512.png',
];

// Instalación: Precache App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => {
        console.log('[SW] App Shell cached');
        return self.skipWaiting();
      })
  );
});

// Activación: Limpiar caches antiguas
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('static-') ||
                name.startsWith('dynamic-') ||
                name.startsWith('images-') ||
                name.startsWith('api-')
              ) && !name.includes(CACHE_VERSION);
            })
            .map((name) => caches.delete(name))
        );
      })
      .then(() => {
        console.log('[SW] Old caches cleaned');
        return self.clients.claim();
      })
  );
});

// Fetch: Estrategias de caché
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar requests no GET
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia para API: Network First con fallback a caché
  if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Estrategia para imágenes: Cache First
  if (isImageRequest(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Estrategia para assets estáticos: Cache First
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Por defecto: Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ==========================================
// Estrategias de Caché
// ==========================================

/**
 * Cache First: Intenta caché primero, luego network
 * Útil para: CSS, JS, fuentes, imágenes estáticas
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Si no hay caché ni network, devolver offline fallback
    return cache.match('/offline.html');
  }
}

/**
 * Network First: Intenta network primero, luego caché
 * Útil para: Datos de API
 */
async function networkFirst(request) {
  const cache = await caches.open(API_CACHE);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      // Agregar header para indicar que es stale
      const headers = new Headers(cached.headers);
      headers.set('X-SW-Cache', 'stale');

      return new Response(cached.body, {
        status: 200,
        statusText: 'OK',
        headers,
      });
    }

    // Si no hay caché, devolver error offline
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'No hay conexión a internet y no hay datos en caché',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Stale While Revalidate: Sirve caché inmediatamente, actualiza en background
 * Útil para: Páginas, contenido que puede ser stale
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  const cached = await cache.match(request);

  // Actualizar en background
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  // Retornar caché inmediatamente (o esperar network si no hay caché)
  return cached || fetchPromise;
}

// ==========================================
// Helpers
// ==========================================

function isAPIRequest(url) {
  return url.pathname.startsWith('/api/') || url.hostname.includes('api.');
}

function isImageRequest(request) {
  return request.destination === 'image';
}

function isStaticAsset(request) {
  const dest = request.destination;
  return (
    dest === 'style' ||
    dest === 'script' ||
    dest === 'font' ||
    request.url.match(/\.(css|js|woff2?|ttf|otf)$/)
  );
}

// ==========================================
// Background Sync
// ==========================================

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue' || event.tag === 'sync-pending-requests') {
    event.waitUntil(notifyClientsToSync());
  }
});

async function notifyClientsToSync() {
  const clients = await self.clients.matchAll({
    includeUncontrolled: true,
    type: 'window',
  });
  for (const client of clients) {
    client.postMessage({ type: 'BACKGROUND_SYNC_TRIGGERED' });
  }
}

// ==========================================
// Push Notifications
// ==========================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nueva notificación',
    icon: data.icon || '/assets/icon-192x192.png',
    badge: data.badge || '/assets/badge-72x72.png',
    tag: data.tag || 'notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Finca Villa Luz', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const notificationData = event.notification.data;
  const action = event.action;

  if (action === 'open' && notificationData?.url) {
    event.waitUntil(openUrl(notificationData.url));
  } else if (notificationData?.url) {
    event.waitUntil(openUrl(notificationData.url));
  }
});

async function openUrl(url) {
  const clients = await self.clients.matchAll({ type: 'window' });

  if (clients.length > 0) {
    clients[0].navigate(url);
    return clients[0].focus();
  }

  return self.clients.openWindow(url);
}

// ==========================================
// Message Handling (comunicación con app)
// ==========================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'GET_VERSION':
      event.source?.postMessage({
        type: 'VERSION',
        version: CACHE_VERSION,
      });
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(
        caches.keys().then((names) =>
          Promise.all(names.map((name) => caches.delete(name)))
        )
      );
      break;

    case 'CACHE_URLS':
      if (payload?.urls) {
        event.waitUntil(
          caches.open(DYNAMIC_CACHE).then((cache) =>
            Promise.all(
              payload.urls.map((url) =>
                fetch(url).then((response) => {
                  if (response.ok) cache.put(url, response);
                })
              )
            )
          )
        );
      }
      break;

    default:
      console.log('[SW] Unknown message:', type);
  }
});

console.log('[SW] Service Worker loaded');
