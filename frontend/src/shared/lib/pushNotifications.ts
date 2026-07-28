import { apiClient } from '@/shared/api/client';

/**
 * Suscripción Web Push.
 *
 * La clave VAPID se pide al backend (`GET /push/vapid-public-key`) en lugar de
 * leerla de una variable de compilación: el servidor ya la tiene y así no hay
 * dos fuentes que se puedan desincronizar.
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const response = await apiClient.get('/push/vapid-public-key');
    return response.data?.data?.public_key ?? null;
  } catch {
    // 503 cuando el servidor no tiene VAPID configurado.
    return null;
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

export async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
  }
  if (Notification.permission !== 'granted') return null;

  const registration = await navigator.serviceWorker.ready;

  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    // Reenviar por si el servidor perdió la fila; /push/subscribe es idempotente.
    await apiClient.post('/push/subscribe', existing.toJSON());
    return existing;
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) return null;

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  // toJSON() expone endpoint y keys; el objeto crudo no es serializable.
  await apiClient.post('/push/subscribe', subscription.toJSON());
  return subscription;
}

export async function unsubscribeUserFromPush(): Promise<void> {
  if (!isPushSupported()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const { endpoint } = subscription;
  await subscription.unsubscribe();
  await apiClient.post('/push/unsubscribe', { endpoint });
}
