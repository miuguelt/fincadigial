function prefetchCriticalRoutes(): void {
  if (import.meta.env.VITE_ENABLE_PWA_PREFETCH !== 'true') return;

  ['/dashboard'].forEach((route) => {
    fetch(route, {
      method: 'GET',
      cache: 'force-cache',
      credentials: 'include',
    }).catch(() => {
      // A failed prefetch must never affect the active application.
    });
  });
}

function registerUpdateNotification(registration: ServiceWorkerRegistration): void {
  registration.addEventListener('updatefound', () => {
    const installingWorker = registration.installing;
    installingWorker?.addEventListener('statechange', () => {
      if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
      }
    });
  });
}

async function registerServiceWorker(): Promise<void> {
  try {
    const { registerSW } = await import('virtual:pwa-register');
    registerSW({
      immediate: false,
      onRegistered(registration) {
        if (registration?.active) setTimeout(prefetchCriticalRoutes, 2000);
      },
      onRegisterError(error) {
        console.error('[PWA] Error registrando SW', error);
      },
    });

    const registration = await navigator.serviceWorker.ready;
    registerUpdateNotification(registration);
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'OFFLINE_SYNC_SUCCESS') {
        window.dispatchEvent(new CustomEvent('pwa-offline-sync-success', {
          detail: { url: event.data.url },
        }));
      }
    });
  } catch (error) {
    console.warn('[PWA] Registro SW no disponible en este entorno', error);
  }
}

function clearDevelopmentServiceWorkers(): void {
  navigator.serviceWorker.getRegistrations?.()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister().catch(() => false))))
    .catch(() => undefined);

  window.caches?.keys?.()
    .then((keys) => Promise.all(keys.map((key) => window.caches.delete(key).catch(() => false))))
    .catch(() => undefined);
}

/** Registers PWA behavior only in production or when explicitly enabled. */
export function registerPwa(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const enabled = import.meta.env.VITE_ENABLE_PWA === 'true' || import.meta.env.PROD;
  if (!enabled) {
    clearDevelopmentServiceWorkers();
    return;
  }

  if (document.readyState === 'complete') {
    void registerServiceWorker();
  } else {
    window.addEventListener('load', () => void registerServiceWorker(), { once: true });
  }
}
