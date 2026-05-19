import { useState, useEffect } from 'react';
import { useOfflineSync, SyncStatus } from '@/shared/hooks/useOfflineSync';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  pendingOperations: number;
  totalOperations: number;
  syncStatus: SyncStatus;
}

export const useOnlineStatus = (): OnlineStatus => {
  const [wasOffline, setWasOffline] = useState(false);
  const { isOnline, pendingCount, syncStatus } = useOfflineSync();

  useEffect(() => {
    if (!isOnline) return;
    setWasOffline(true);
    const t = setTimeout(() => setWasOffline(false), 5000);
    return () => clearTimeout(t);
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    pendingOperations: pendingCount,
    totalOperations: pendingCount + syncStatus.failed,
    syncStatus,
  };
};
