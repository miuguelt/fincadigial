import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineSync } from '@/shared/hooks/useOfflineSync';

export const SyncStatus: React.FC = () => {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOfflineSync();

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all duration-500 ${
          isOnline
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
        }`}
      >
        {isOnline ? (
          <>
            {isSyncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {isSyncing ? 'Sincronizando' : 'En Línea'}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 animate-pulse" />
            <span className="hidden sm:inline">Modo Campo</span>
          </>
        )}
      </div>

      {pendingCount > 0 && (
        <button
          onClick={syncNow}
          disabled={!isOnline || isSyncing}
          title={`${pendingCount} operación(es) pendiente(s). Click para sincronizar.`}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 border border-amber-500/20 hover:bg-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{pendingCount} pendiente{pendingCount !== 1 ? 's' : ''}</span>
        </button>
      )}
    </div>
  );
};
