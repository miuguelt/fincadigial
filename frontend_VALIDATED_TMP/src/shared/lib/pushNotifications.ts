import { apiClient } from '@/shared/api/client';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush() {
  if (!('serviceWorker' in navigator) || !VAPID_PUBLIC_KEY) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    const existingSubscription = await registration.pushManager.getSubscription();
    if (existingSubscription) {
      return existingSubscription;
    }

    const subscribeOptions = {
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    };

    const subscription = await registration.pushManager.subscribe(subscribeOptions);
    
    // Send to backend
    await apiClient.post('/api/v1/push/subscribe', subscription);
    
    return subscription;
  } catch (error) {
    console.error('Error al suscribir a notificaciones push:', error);
    throw error;
  }
}

export async function unsubscribeUserFromPush() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  
  if (subscription) {
    await subscription.unsubscribe();
    await apiClient.post('/api/v1/push/unsubscribe', {
      endpoint: subscription.endpoint
    });
  }
}

export async function getPushSubscription() {
  if (!('serviceWorker' in navigator)) return null;
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}
