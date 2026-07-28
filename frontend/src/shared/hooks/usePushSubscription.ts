import { useCallback, useEffect, useState } from 'react';
import {
  getPushSubscription,
  isPushSupported,
  subscribeUserToPush,
  unsubscribeUserFromPush,
} from '@/shared/lib/pushNotifications';

/** Estado de la suscripción Web Push del dispositivo actual. */
export function usePushSubscription() {
  const supported = isPushSupported();
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;
    getPushSubscription()
      .then((sub) => {
        if (!cancelled) setSubscribed(Boolean(sub));
      })
      .catch(() => {
        if (!cancelled) setSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [supported]);

  const toggle = useCallback(async () => {
    if (!supported || busy) return;
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeUserFromPush();
        setSubscribed(false);
      } else {
        const sub = await subscribeUserToPush();
        setSubscribed(Boolean(sub));
      }
    } catch {
      setSubscribed(Boolean(await getPushSubscription().catch(() => null)));
    } finally {
      setBusy(false);
    }
  }, [busy, subscribed, supported]);

  return { supported, subscribed, busy, toggle };
}
