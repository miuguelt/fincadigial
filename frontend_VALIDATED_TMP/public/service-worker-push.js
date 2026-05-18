/**
 * Service Worker para Web Push Notifications
 * ==========================================
 *
 * Este Service Worker maneja:
 * - Recepción de notificaciones push
 * - Click en notificaciones (navegación)
 * - Background sync (opcional)
 *
 * Debe registrarse en el main.tsx o App.tsx
 */

// Versión del service worker
const CACHE_VERSION = 'v1';
const CACHE_NAME = `push-notifications-${CACHE_VERSION}`;

// URLs importantes
const FALLBACK_ICON = '/assets/icon-192x192.png';
const FALLBACK_BADGE = '/assets/badge-72x72.png';

// =============================================================================
// Event: INSTALL
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW Push] Service Worker instalado');
  // Skip waiting para activar inmediatamente
  self.skipWaiting();
});

// =============================================================================
// Event: ACTIVATE
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW Push] Service Worker activado');

  // Limpiar caches antiguas
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('push-notifications-'))
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );

  // Tomar control de todas las páginas
  event.waitUntil(self.clients.claim());
});

// =============================================================================
// Event: PUSH
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW Push] Notificación push recibida:', event);

  if (!event.data) {
    console.warn('[SW Push] Evento push sin datos');
    return;
  }

  // Parsear datos de la notificación
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW Push] Error parseando datos:', e);
    data = {
      title: 'Nueva notificación',
      body: event.data.text(),
    };
  }

  // Opciones por defecto
  const title = data.title || 'Finca Villa Luz';
  const options = {
    body: data.body || 'Tienes una nueva notificación',
    icon: data.icon || FALLBACK_ICON,
    badge: data.badge || FALLBACK_BADGE,
    tag: data.tag || `notification-${Date.now()}`,
    requireInteraction: data.requireInteraction || false,
    renotify: data.renotify || false,
    silent: data.silent || false,
    data: data.data || {},
    // Acciones (botones en la notificación)
    actions: data.actions || [],
    // Comportamiento de la notificación
    dir: 'auto',
    lang: 'es',
  };

  // Mostrar la notificación
  event.waitUntil(
    self.registration.showNotification(title, options)
  );

  // Enviar mensaje a la app (para actualizar UI si está abierta)
  event.waitUntil(
    notifyClients({
      type: 'PUSH_RECEIVED',
      payload: data,
    })
  );
});

// =============================================================================
// Event: NOTIFICATIONCLICK
// =============================================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Click en notificación:', event.notification);

  event.notification.close();

  const notificationData = event.notification.data || {};
  const action = event.action;

  // Manejar acciones específicas
  if (action) {
    console.log('[SW Push] Acción seleccionada:', action);

    switch (action) {
      case 'open':
        event.waitUntil(openWindow(notificationData.url || '/'));
        break;
      case 'dismiss':
        // Solo cerrar
        break;
      default:
        // Acción personalizada
        event.waitUntil(handleCustomAction(action, notificationData));
    }
  } else {
    // Click en la notificación (no en un botón)
    const url = notificationData.url || '/';
    event.waitUntil(openWindow(url));
  }
});

// =============================================================================
// Event: NOTIFICATIONCLOSE
// =============================================================================

self.addEventListener('notificationclose', (event) => {
  console.log('[SW Push] Notificación cerrada:', event.notification);

  // Notificar a la app que se cerró
  event.waitUntil(
    notifyClients({
      type: 'PUSH_CLOSED',
      tag: event.notification.tag,
    })
  );
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Abrir una ventana/pestaña con una URL.
 */
async function openWindow(url) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  // Buscar si ya hay una ventana abierta
  const client = clients.find((c) => c.url === url);

  if (client) {
    // Enfocar la ventana existente
    return client.focus();
  }

  // Abrir nueva ventana
  if (clients.length > 0) {
    // Hay ventanas abiertas, abrir en una de ellas
    return clients[0].navigate(url).then((client) => client?.focus());
  }

  // No hay ventanas, abrir nueva
  return self.clients.openWindow(url);
}

/**
 * Enviar mensaje a todos los clients (pestañas abiertas).
 */
async function notifyClients(message) {
  const clients = await self.clients.matchAll({
    type: 'window',
    includeUncontrolled: true,
  });

  clients.forEach((client) => {
    client.postMessage(message);
  });
}

/**
 * Manejar acciones personalizadas.
 */
async function handleCustomAction(action, data) {
  console.log('[SW Push] Acción personalizada:', action, data);

  // Implementar acciones específicas según necesidad
  switch (action) {
    case 'mark-as-read':
      // Llamar a API para marcar como leído
      break;
    case 'complete-task':
      // Llamar a API para completar tarea
      break;
    default:
      // Abrir la URL por defecto
      return openWindow(data.url || '/');
  }
}

// =============================================================================
// Message Handler (comunicación con la app)
// =============================================================================

self.addEventListener('message', (event) => {
  console.log('[SW Push] Mensaje recibido:', event.data);

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

    case 'PING':
      event.source?.postMessage({
        type: 'PONG',
      });
      break;

    default:
      console.log('[SW Push] Mensaje desconocido:', type);
  }
});

// =============================================================================
// Background Sync (opcional - para offline)
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW Push] Background sync:', event.tag);

  if (event.tag === 'sync-pending-operations') {
    // Sincronizar operaciones pendientes
    event.waitUntil(syncPendingOperations());
  }
});

async function syncPendingOperations() {
  // Implementar sincronización de operaciones pendientes
  // Esto requiere integración con IndexedDB
  console.log('[SW Push] Sincronizando operaciones pendientes...');
}
