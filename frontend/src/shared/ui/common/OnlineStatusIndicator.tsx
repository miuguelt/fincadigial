import React from 'react';
import { useOfflineSync } from '@/shared/hooks/useOfflineSync';
import { cn } from '@/shared/ui/cn';
import { Wifi, WifiOff, RefreshCw, AlertTriangle, CheckCircle2, Cloud, Upload, X } from 'lucide-react';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

type StatusType = {
  icon: typeof Wifi;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
  description: string;
};

export const OnlineStatusIndicator: React.FC = () => {
  const { isOnline, pendingCount, syncStatus, syncNow } = useOfflineSync();
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [lastSyncResult, setLastSyncResult] = React.useState<{ success: number; failed: number } | null>(null);
  const wasOffline = React.useRef(false);

  const [hasSidebarOffset, setHasSidebarOffset] = React.useState(false);

  React.useEffect(() => {
    const checkSidebar = () => {
      const sidebar = document.querySelector('[aria-hidden="false"]');
      const isLargeScreen = window.innerWidth >= 1024;
      setHasSidebarOffset(!!sidebar && isLargeScreen);
    };

    checkSidebar();

    const observer = new MutationObserver(checkSidebar);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true
    });

    window.addEventListener('resize', checkSidebar);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkSidebar);
    };
  }, []);

  React.useEffect(() => {
    if (!isOnline) wasOffline.current = true;
  }, [isOnline]);

  React.useEffect(() => {
    if (!isOnline || pendingCount > 0 || syncStatus.failed > 0) {
      setIsExpanded(true);
      if (isOnline && pendingCount === 0 && syncStatus.failed === 0) {
        const timer = setTimeout(() => setIsExpanded(false), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [isOnline, pendingCount, syncStatus.failed]);

  React.useEffect(() => {
    const unsub = offlineQueue.onSyncResult((success) => {
      setLastSyncResult(prev => ({
        success: (prev?.success || 0) + (success ? 1 : 0),
        failed: (prev?.failed || 0) + (success ? 0 : 1),
      }));
    });

    const handleAuthError = () => {
      setLastSyncResult(prev => ({
        success: prev?.success || 0,
        failed: (prev?.failed || 0) + 1,
      }));
    };

    window.addEventListener('sync-auth-error', handleAuthError);

    return () => {
      unsub();
      window.removeEventListener('sync-auth-error', handleAuthError);
    };
  }, []);

  React.useEffect(() => {
    if (lastSyncResult && !syncStatus.syncing) {
      const timer = setTimeout(() => setLastSyncResult(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [lastSyncResult, syncStatus.syncing]);

  const handleSyncNow = async () => {
    setIsSyncing(true);
    setLastSyncResult(null);
    try { await syncNow(); } finally { setIsSyncing(false); }
  };

  const getStatus = (): StatusType => {
    const base = { icon: Wifi, color: 'text-success dark:text-success', bgColor: 'bg-success/10/90 dark:bg-green-900/45', borderColor: 'border-success/40/40 dark:border-green-700/40', label: 'En línea', description: 'Conectado y sincronizado' };
    if (!isOnline) return { ...base, icon: WifiOff, color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-100/90 dark:bg-orange-900/45', borderColor: 'border-orange-300/40 dark:border-orange-700/40', label: 'Sin conexión', description: pendingCount > 0 ? `${pendingCount} operación(es) pendientes` : 'Trabajando sin conexión' };
    if (syncStatus.syncing || isSyncing) return { ...base, icon: RefreshCw, color: 'text-info dark:text-info/80', bgColor: 'bg-info/10/90 dark:bg-blue-900/45', borderColor: 'border-info/40/40 dark:border-blue-700/40', label: 'Sincronizando...', description: `Enviando ${pendingCount + syncStatus.failed} operación(es)` };
    if (syncStatus.failed > 0) return { ...base, icon: AlertTriangle, color: 'text-destructive dark:text-destructive/80', bgColor: 'bg-destructive/10/90 dark:bg-red-900/45', borderColor: 'border-red-300/40 dark:border-red-700/40', label: 'Error de sync', description: `${syncStatus.failed} operación(es) fallida(s)` };
    if (wasOffline.current && pendingCount === 0 && syncStatus.failed === 0) return { ...base, icon: CheckCircle2, label: 'Sincronizado', description: 'Todo sincronizado correctamente' };
    if (pendingCount > 0) return { ...base, icon: Cloud, color: 'text-info dark:text-info/80', bgColor: 'bg-info/10/90 dark:bg-blue-900/45', borderColor: 'border-info/40/40 dark:border-blue-700/40', label: 'Pendiente', description: `${pendingCount} operación(es) esperando` };
    return base;
  };

  const status = getStatus();
  const StatusIcon = status.icon;
  const totalIssues = pendingCount + syncStatus.failed;

  if (isOnline && pendingCount === 0 && syncStatus.failed === 0 && !wasOffline.current && !isExpanded) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 z-40 transition-all duration-500 ease-out",
        "left-3 w-auto max-w-[calc(100vw-6rem)] sm:max-w-sm",
        hasSidebarOffset ? "lg:left-[316px]" : "left-3 sm:left-6"
      )}
    >
      <div className={cn("rounded-xl border border-white/20 shadow-[0_10px_30px_rgba(0,0,0,0.3)] backdrop-blur-2xl transition-all duration-300", status.bgColor, status.borderColor, isExpanded ? "p-3" : "p-2 sm:p-2.5")}>
        <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-2 w-full text-left">
          <StatusIcon className={cn("h-4 w-4 md:h-5 md:w-5 flex-shrink-0", status.color, (syncStatus.syncing || isSyncing) && "animate-spin")} />
          <div className="flex-1 min-w-0">
            <p className={cn("text-xs md:text-sm font-semibold fit-clamp", status.color)}>{status.label}</p>
            {!isExpanded && totalIssues > 0 && <p className="text-[11px] md:text-xs text-muted-foreground fit-clamp">{status.description}</p>}
          </div>
          {totalIssues > 0 && <span className={cn("px-1.5 md:px-2 py-0.5 rounded-full text-[11px] md:text-xs font-bold", "bg-card/50 dark:bg-black/20", status.color)}>{totalIssues}</span>}
        </button>

        {isExpanded && (
          <div className="mt-2 md:mt-3 space-y-2 md:space-y-3">
            <p className="text-[11px] md:text-xs text-muted-foreground">{status.description}</p>

            {lastSyncResult && !syncStatus.syncing && (
              <div className={cn("p-2 rounded-md text-[11px] md:text-xs", lastSyncResult.failed > 0 ? "bg-destructive/10 dark:bg-red-900/30 text-destructive dark:text-red-300" : "bg-success/10 dark:bg-green-900/30 text-success dark:text-green-300")}>
                {lastSyncResult.failed > 0 ? `✓ ${lastSyncResult.success} sync, ✗ ${lastSyncResult.failed} fallidas` : `✓ ${lastSyncResult.success} operación(es) sincronizada(s)`}
              </div>
            )}

            {(pendingCount > 0 || syncStatus.failed > 0 || syncStatus.syncing) && (
              <div className="space-y-1 text-[11px] md:text-xs">
                {(syncStatus.syncing || isSyncing) && <div className="flex justify-between"><span className="text-info dark:text-info/80">Sincronizando:</span><span className="font-semibold text-info dark:text-info/80">{pendingCount + syncStatus.failed}</span></div>}
                {!syncStatus.syncing && !isSyncing && pendingCount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Pendientes:</span><span className="font-semibold">{pendingCount}</span></div>}
                {syncStatus.failed > 0 && <div className="flex justify-between"><span className="text-destructive dark:text-destructive/80">Fallidas:</span><span className="font-semibold text-destructive dark:text-destructive/80">{syncStatus.failed}</span></div>}
              </div>
            )}

            <div className="flex gap-1.5 md:gap-2">
              {(pendingCount > 0 || syncStatus.failed > 0) && (
                <button onClick={handleSyncNow} disabled={syncStatus.syncing || isSyncing || !isOnline} className={cn("flex-1 px-2 md:px-3 py-1.5 md:py-2 rounded-md text-[11px] md:text-xs font-medium flex items-center justify-center gap-1 transition-all", !isOnline ? "bg-muted text-muted-foreground cursor-not-allowed" : syncStatus.syncing || isSyncing ? "bg-info/10 text-info cursor-wait" : "bg-primary text-primary-foreground hover:bg-primary/90")}>
                  <Upload className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  {syncStatus.syncing || isSyncing ? 'Sync...' : 'Sincronizar'}
                </button>
              )}
              {syncStatus.failed > 0 && (
                <button onClick={() => offlineQueue.retryFailedOperations()} className="px-2 md:px-3 py-1.5 md:py-2 rounded-md text-[11px] md:text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 hover:bg-orange-200 transition-colors flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span className="hidden sm:inline">Reintentar</span>
                </button>
              )}
              {syncStatus.failed > 0 && (
                <button onClick={() => offlineQueue.clearFailedOperations()} className="px-2 md:px-3 py-1.5 md:py-2 rounded-md text-[11px] md:text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center gap-1">
                  <X className="h-3 w-3 md:h-3.5 md:w-3.5" />
                  <span className="hidden sm:inline">Limpiar</span>
                </button>
              )}
            </div>

            {!isOnline && <p className="text-[11px] md:text-[11px] text-muted-foreground italic pt-1 border-t border-current/20">💡 Los cambios se guardarán localmente y se sincronizarán al recuperar conexión.</p>}
            {isOnline && pendingCount > 0 && !syncStatus.syncing && <p className="text-[11px] md:text-[11px] text-muted-foreground pt-1 border-t border-current/20">💡 Click en "Sincronizar" para enviar cambios al servidor</p>}
          </div>
        )}
      </div>
    </div>
  );
};
