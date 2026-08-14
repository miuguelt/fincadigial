import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

export interface SyncStatus {
  pending: number;
  failed: number;
  syncing: boolean;
}

export interface OfflineSyncResult {
  pendingCount: number;
  isSyncing: boolean;
  isOnline: boolean;
  syncStatus: SyncStatus;
  syncNow: () => Promise<void>;
}

export function useOfflineSync(): OfflineSyncResult {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    pending: 0,
    failed: 0,
    syncing: false,
  });

  const refresh = useCallback(async () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
    const [count, status] = await Promise.all([
      offlineQueue.getPendingCount(),
      offlineQueue.getStatusCounts(),
    ]);
    setPendingCount(count);
    setIsSyncing(status.syncing);
    setSyncStatus(status);
  }, []);

  const syncNow = useCallback(async () => {
    setIsSyncing(true);
    try {
      await offlineQueue.resetStuckOperations();
      await offlineQueue.syncQueue();
    } finally {
      await refresh();
      setIsSyncing(false);
    }
  }, [refresh]);

  useEffect(() => {
    refresh();

    const handleOnline = () => {
      setIsOnline(true);
      refresh();
      setTimeout(() => {
        offlineQueue.resetStuckOperations().then(() => offlineQueue.syncQueue()).catch(() => {});
      }, 500);
    };
    const handleOffline = () => setIsOnline(false);
    const handleSynced = () => refresh();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refresh();
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          setTimeout(() => {
            offlineQueue.resetStuckOperations().then(() => offlineQueue.syncQueue()).catch(() => {});
          }, 300);
        }
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('offline-queue-synced', handleSynced);
    window.addEventListener('focus', handleVisibility);
    document.addEventListener('visibilitychange', handleVisibility);

    const interval = setInterval(refresh, 15000);
    const syncInterval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine && !document.hidden) {
        offlineQueue.syncQueue().catch(() => {});
      }
    }, 60000);
    const unsub = offlineQueue.onSyncResult(() => refresh());

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('offline-queue-synced', handleSynced);
      window.removeEventListener('focus', handleVisibility);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
      clearInterval(syncInterval);
      unsub();
    };
  }, [refresh]);

  return { pendingCount, isSyncing, isOnline, syncStatus, syncNow };
}
