import { useState, useCallback, useEffect } from 'react';
import { FieldReadyService, FieldReadyStatus, PrefetchProgress } from '@/shared/api/offline/FieldReadyService';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

export interface UseFieldReadyResult {
  status: FieldReadyStatus;
  progress: PrefetchProgress | null;
  isPrefetching: boolean;
  startPrefetch: () => Promise<void>;
  clearCache: () => Promise<void>;
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: FieldReadyStatus = {
  isReady: false,
  cachedAt: null,
  itemsCached: 0,
  pendingSync: 0,
};

export function useFieldReady(): UseFieldReadyResult {
  const [status, setStatus]       = useState<FieldReadyStatus>(DEFAULT_STATUS);
  const [progress, setProgress]   = useState<PrefetchProgress | null>(null);
  const [isPrefetching, setIsPrefetching] = useState(false);

  const refresh = useCallback(async () => {
    const [s, pending] = await Promise.all([
      FieldReadyService.getStatus(),
      offlineQueue.getPendingCount(),
    ]);
    setStatus({ ...s, pendingSync: pending });
  }, []);

  const startPrefetch = useCallback(async () => {
    if (isPrefetching) return;
    setIsPrefetching(true);
    setProgress({ step: 'Iniciando...', current: 0, total: 9, done: false });
    try {
      await FieldReadyService.prefetch((p) => setProgress(p));
    } finally {
      setIsPrefetching(false);
      await refresh();
    }
  }, [isPrefetching, refresh]);

  const clearCache = useCallback(async () => {
    await FieldReadyService.clear();
    setProgress(null);
    await refresh();
  }, [refresh]);

  // Actualizar estado inicial y cada 60s
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 60_000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { status, progress, isPrefetching, startPrefetch, clearCache, refresh };
}
