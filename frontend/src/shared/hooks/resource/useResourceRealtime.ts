import { useEffect, useRef } from 'react';
import { UseResourceOptions } from './types';

export function useResourceRealtime(
  options: UseResourceOptions,
  refetch: () => Promise<any>,
  crudInProgressRef: React.MutableRefObject<boolean>,
  skipCacheUntilRef: React.MutableRefObject<number>,
  endpointPrefix: string
) {
  const realtimeEnabled = options.enableRealtime === true;
  const pollInterval = typeof options.pollIntervalMs === 'number'
    ? (options.pollIntervalMs > 0 ? Math.max(2000, options.pollIntervalMs) : 0)
    : 0;
  const refetchOnFocus = options.refetchOnFocus !== false;
  const refetchOnReconnect = options.refetchOnReconnect !== false;
  const pollTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!realtimeEnabled || !pollInterval) return;
    if (pollTimerRef.current) {
      try { clearInterval(pollTimerRef.current); } catch { /* noop */ }
      pollTimerRef.current = null;
    }
    pollTimerRef.current = setInterval(() => {
      // No consultar en una pestaña oculta ni sin red: gasta batería y cuota.
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
      // Tampoco durante una escritura: sobrescribiría la actualización optimista.
      if (crudInProgressRef.current) return;
      skipCacheUntilRef.current = Date.now() + 5000;
      void refetch().catch(() => {});
    }, pollInterval);
    return () => {
      if (pollTimerRef.current) {
        try { clearInterval(pollTimerRef.current); } catch { /* noop */ }
        pollTimerRef.current = null;
      }
    };
  }, [realtimeEnabled, pollInterval, refetch, crudInProgressRef, skipCacheUntilRef]);

  useEffect(() => {
    const onFocus = () => {
      if (!realtimeEnabled || !refetchOnFocus) return;
      if (crudInProgressRef.current) return;
      skipCacheUntilRef.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    const onOnline = () => {
      if (!realtimeEnabled || !refetchOnReconnect) return;
      if (crudInProgressRef.current) return;
      skipCacheUntilRef.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    if (realtimeEnabled) {
      window.addEventListener('focus', onFocus);
      const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
      window.addEventListener('visibilitychange', onVisibility);
      window.addEventListener('online', onOnline);
      return () => {
        window.removeEventListener('focus', onFocus);
        window.removeEventListener('visibilitychange', onVisibility);
        window.removeEventListener('online', onOnline);
      };
    }
    return () => {};
  }, [realtimeEnabled, refetchOnFocus, refetchOnReconnect, refetch, crudInProgressRef, skipCacheUntilRef]);

  useEffect(() => {
    if (!realtimeEnabled) return;
    const endpointSlug = (() => {
      const parts = String(endpointPrefix || '').split('/').filter(Boolean);
      return parts.length ? parts[parts.length - 1] : endpointPrefix;
    })();
    const onResourceChanged = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      const slug = String(detail?.endpoint || '');
      if (!slug || slug !== endpointSlug) return;
      if (crudInProgressRef.current) return;
      skipCacheUntilRef.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    const onGlobalChange = () => {
      if (crudInProgressRef.current) return;
      skipCacheUntilRef.current = Date.now() + 5000;
      void refetch().catch(() => {});
    };
    window.addEventListener('server-resource-changed', onResourceChanged as EventListener);
    window.addEventListener('server-global-change', onGlobalChange as EventListener);
    return () => {
      window.removeEventListener('server-resource-changed', onResourceChanged as EventListener);
      window.removeEventListener('server-global-change', onGlobalChange as EventListener);
    };
  }, [realtimeEnabled, refetch, crudInProgressRef, skipCacheUntilRef, endpointPrefix]);

}
