import React, { useState } from "react";
import { Wifi, WifiOff, RefreshCw, AlertTriangle, Cloud, CheckCircle2, X } from "lucide-react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { cn } from "@/shared/ui/cn";

export const SyncStatus: React.FC = () => {
  const { isOnline, wasOffline, pendingOperations, syncStatus } = useOnlineStatus();
  const [isOpen, setIsOpen] = useState(false);

  const handleRetryFailed = async () => {
    await offlineQueue.retryFailedOperations();
  };

  const handleClearFailed = () => {
    offlineQueue.clearFailedOperations();
  };

  const getStatusDetails = () => {
    if (!isOnline) {
      return {
        icon: WifiOff,
        color: "text-warning dark:text-warning/80",
        label: "Modo Campo",
        description: syncStatus.pending > 0
          ? `${syncStatus.pending} operación(es) pendiente(s) de sincronizar.`
          : "Trabajando offline. Los cambios se guardan localmente."
      };
    }
    if (syncStatus.syncing) {
      return {
        icon: RefreshCw,
        color: "text-info dark:text-info/80",
        label: "Sincronizando...",
        description: `Enviando ${syncStatus.pending} operación(es) al servidor.`
      };
    }
    if (syncStatus.failed > 0) {
      return {
        icon: AlertTriangle,
        color: "text-destructive dark:text-destructive/80",
        label: "Sincronización Fallida",
        description: `${syncStatus.failed} operación(es) no pudieron completarse.`
      };
    }
    if (wasOffline && syncStatus.pending === 0 && syncStatus.failed === 0) {
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        label: "Sincronizado",
        description: "Operaciones locales cargadas con éxito."
      };
    }
    return {
      icon: Cloud,
      color: "text-info dark:text-info/80",
      label: "Pendiente",
      description: `${syncStatus.pending} operación(es) esperando sincronización.`
    };
  };

  const status = getStatusDetails();
  const StatusIcon = status.icon;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex h-8 w-8 items-center justify-center rounded-xl transition-all",
            isOnline
              ? "hover:bg-emerald-500/10 text-emerald-600"
              : "hover:bg-warning/10 text-warning"
          )}
          title={status.label}
        >
          {isOnline ? (
            syncStatus.syncing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Wifi className="h-4 w-4" />
            )
          ) : (
            <WifiOff className="h-4 w-4 animate-pulse" />
          )}
          {(pendingOperations > 0 || syncStatus.failed > 0) && (
            <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center bg-warning text-white text-[8px] font-bold rounded-full">
              {pendingOperations + syncStatus.failed}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <PopoverContent
        className={cn(
          "z-50 bg-card border-border/80 shadow-2xl p-4",
          "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-t-3xl max-md:border-t-2 max-md:p-6 max-md:w-full",
          "md:w-80 md:rounded-lg"
        )}
        align="end"
        sideOffset={8}
      >
        <div className="md:hidden w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusIcon className={cn("h-5 w-5", status.color, syncStatus.syncing && "animate-spin")} />
            <span className="font-bold text-sm">{status.label}</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          {status.description}
        </p>

        {(syncStatus.pending > 0 || syncStatus.failed > 0) && (
          <div className="space-y-2 text-xs bg-muted/40 rounded-xl p-3 mb-4">
            {syncStatus.pending > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Operaciones en cola:</span>
                <span className="font-bold">{syncStatus.pending}</span>
              </div>
            )}
            {syncStatus.failed > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-destructive">Fallidas:</span>
                <span className="font-bold text-destructive">{syncStatus.failed}</span>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {syncStatus.failed > 0 ? (
            <>
              <button
                onClick={handleRetryFailed}
                disabled={!isOnline}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md disabled:opacity-50"
              >
                Reintentar
              </button>
              <button
                onClick={handleClearFailed}
                className="py-2 px-3 rounded-xl text-xs font-bold bg-muted text-muted-foreground hover:bg-muted/80 transition-all"
              >
                Limpiar
              </button>
            </>
          ) : (
            <button
              onClick={handleRetryFailed}
              disabled={!isOnline || syncStatus.syncing}
              className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", syncStatus.syncing && "animate-spin")} />
              <span>{syncStatus.syncing ? "Sincronizando..." : "Sincronizar Ahora"}</span>
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
