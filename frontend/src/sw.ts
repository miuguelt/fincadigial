/// <reference lib="webworker" />
import { precacheAndRoute, matchPrecache } from 'workbox-precaching';
import { registerRoute, setCatchHandler } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { Queue } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope;

// Precache only the shell and critical chunks. Pre-caching every lazy route
// makes first install download several megabytes on rural networks.
const criticalPrecache = self.__WB_MANIFEST.filter((entry) => {
  const url = typeof entry === 'string' ? entry : entry.url;
  return /(?:^|\/)(?:index\.html|offline\.html|manifest\.webmanifest|pwa-[^/]+\.png)$/.test(url);
});
precacheAndRoute(criticalPrecache);

// ─────────────────────────────────────────────────────────────
// BackgroundSync — cola de escrituras para modo sin señal
// Las operaciones POST/PUT/PATCH/DELETE quedan encoladas y se
// reenvían automáticamente cuando vuelve la conexión.
// ─────────────────────────────────────────────────────────────
const offlineQueue = new Queue('finca-offline-writes', {
  maxRetentionTime: 7 * 24 * 60, // 7 días en minutos
  onSync: async ({ queue }) => {
    let entry: { request: Request } | undefined;
    while ((entry = await queue.shiftRequest())) {
      try {
        await fetch(entry.request.clone());
        // Notificar al cliente que la sincronización fue exitosa
        const clients = await self.clients.matchAll();
        clients.forEach(c => c.postMessage({ type: 'OFFLINE_SYNC_SUCCESS', url: entry!.request.url }));
      } catch (err) {
        await queue.unshiftRequest(entry);
        throw err; // Fuerza reintento posterior
      }
    }
  },
});

// Intercept API mutations for BackgroundSync. Workbox accepts one method per
// route, so register each mutation explicitly.
const queueMutation = async ({ event }: { event: ExtendableEvent }) => {
  const fetchEvent = event as FetchEvent;
  try {
    return await fetch(fetchEvent.request.clone());
  } catch {
    await offlineQueue.pushRequest(fetchEvent);
    return new Response(
      JSON.stringify({ queued: true, message: 'Operación guardada. Se enviará cuando haya señal.' }),
      { status: 202, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
  registerRoute(({ url }) => url.pathname.startsWith('/api/v1/'), queueMutation, method);
}

// ─────────────────────────────────────────────────────────────
// Caché de imágenes (30 días, CacheFirst)
// ─────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'image',
  new CacheFirst({
    cacheName: 'images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  })
);

// ─────────────────────────────────────────────────────────────
// Caché de fuentes (1 año)
// ─────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({
    cacheName: 'fonts',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 365 * 24 * 60 * 60,
      }),
    ],
  })
);

// Lazy-loaded JavaScript and CSS are cached after their first successful load.
registerRoute(
  ({ request }) => request.destination === 'script' || request.destination === 'style',
  new CacheFirst({
    cacheName: 'static-assets',
    plugins: [new ExpirationPlugin({ maxEntries: 120, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  }),
);

// ─────────────────────────────────────────────────────────────
// Global catalogs only. User/finca-scoped responses stay in the scoped
// IndexedDB cache managed by the API client.
// ─────────────────────────────────────────────────────────────
registerRoute(
  ({ url }) =>
    url.pathname.includes('/api/v1/breeds') ||
    url.pathname.includes('/api/v1/species') ||
    url.pathname.includes('/api/v1/food_types') ||
    url.pathname.includes('/api/v1/food-types') ||
    url.pathname.includes('/api/v1/vaccines') ||
    url.pathname.includes('/api/v1/medications') ||
    url.pathname.includes('/api/v1/route-administrations') ||
    url.pathname.includes('/api/v1/diseases'),
  new StaleWhileRevalidate({
    cacheName: 'master-data-cache',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 150,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  })
);

// ─────────────────────────────────────────────────────────────
// Navegación SPA (NetworkFirst con fallback al shell)
// ─────────────────────────────────────────────────────────────
registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({
        maxEntries: 10,
        maxAgeSeconds: 24 * 60 * 60,
      }),
    ],
  })
);

// ─────────────────────────────────────────────────────────────
// Fallback offline: cuando navegación falla sin caché → offline.html
// ─────────────────────────────────────────────────────────────
setCatchHandler(async ({ event }) => {
  const req = (event as FetchEvent).request;
  if (req.mode === 'navigate') {
    // Intentar el shell SPA primero (precacheado)
    const shell = await matchPrecache('/index.html');
    if (shell) return shell;
    // Último recurso: offline.html estático en public/
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
  }
  return Response.error();
});

// ─────────────────────────────────────────────────────────────
// Notificaciones Push
// ─────────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      const title = data.title || 'Finca Villa Luz';
      const options = {
        body: data.body || 'Tienes una nueva notificación',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        data: { url: data.url || '/' },
        actions: [{ action: 'open', title: 'Ver detalle' }],
      };
      event.waitUntil(self.registration.showNotification(title, options));
    } catch (err) {
      console.error('Error al recibir notificación push:', err);
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});

// ─────────────────────────────────────────────────────────────
// Notificar al cliente cuando BackgroundSync completa
// ─────────────────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
