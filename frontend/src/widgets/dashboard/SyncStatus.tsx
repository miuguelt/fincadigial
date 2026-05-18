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
        color: "text-amber-600 dark:text-amber-400",
        label: "Modo Campo",
        description: pendingOperations > 0
          ? `${pendingOperations} operación(es) pendiente(s) de sincronizar.`
          : "Trabajando offline. Los cambios se guardan localmente."
      };
    }
    if (syncStatus.syncing) {
      return {
        icon: RefreshCw,
        color: "text-blue-600 dark:text-blue-400",
        label: "Sincronizando...",
        description: `Enviando ${syncStatus.pending} operación(es) al servidor.`
      };
    }
    if (syncStatus.failed > 0) {
      return {
        icon: AlertTriangle,
        color: "text-red-600 dark:text-red-400",
        label: "Sincronización Fallida",
        description: `${syncStatus.failed} operación(es) no pudieron completarse.`
      };
    }
    if (wasOffline && pendingOperations === 0) {
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400",
        label: "Sincronizado",
        description: "Operaciones locales cargadas con éxito."
      };
    }
    return {
      icon: Cloud,
      color: "text-blue-600 dark:text-blue-400",
      label: "Pendiente",
      description: `${pendingOperations} operación(es) esperando conexión.`
    };
  };

  const status = getStatusDetails();
  const StatusIcon = status.icon;

  return (
    <div className="flex items-center gap-2">
      {/* Indicador de conexión principal */}
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all duration-300",
          isOnline
            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
            : "bg-orange-500/10 text-orange-600 border-orange-500/20"
        )}
      >
        {isOnline ? (
          <>
            {syncStatus.syncing ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Wifi className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">
              {syncStatus.syncing ? "Sincronizando" : "En Línea"}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 animate-pulse" />
            <span className="hidden sm:inline">Modo Campo</span>
          </>
        )}
      </div>

      {/* Trigger de Operaciones Pendientes */}
      {pendingOperations > 0 && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all hover:bg-amber-500/20 duration-300",
                syncStatus.failed > 0
                  ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}
            >
              <RefreshCw className={cn("h-3 w-3", (syncStatus.syncing || !isOnline) ? "animate-spin" : "")} />
              <span>
                {pendingOperations} Pendiente{pendingOperations !== 1 ? "s" : ""}
              </span>
            </button>
          </PopoverTrigger>

          {/* Modal Overlay para Móvil */}
          {isOpen && (
            <div 
              className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
              onClick={() => setIsOpen(false)}
            />
          )}

          <PopoverContent 
            className={cn(
              "z-50 bg-card border-border/80 shadow-2xl p-4 transition-all duration-300",
              // Móvil: Bottom Sheet deslizable
              "max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:rounded-t-3xl max-md:border-t-2 max-md:p-6 max-md:w-full max-md:animate-in max-md:slide-in-from-bottom-10 max-md:duration-300",
              // Desktop: Popover estándar al alinearse con el trigger
              "md:w-80 md:rounded-2xl"
            )}
            align="end"
            sideOffset={8}
          >
            {/* Control de cierre y tirador en móvil */}
            <div className="md:hidden w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />

            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <StatusIcon className={cn("h-5 w-5", status.color, syncStatus.syncing && "animate-spin")} />
                <span className="font-bold text-sm text-foreground">{status.label}</span>
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

            {/* Detalles de la cola */}
            {(syncStatus.pending > 0 || syncStatus.failed > 0) && (
              <div className="space-y-2 text-xs bg-muted/40 rounded-xl p-3 mb-4">
                {syncStatus.pending > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Operaciones en cola:</span>
                    <span className="font-bold text-foreground">{syncStatus.pending}</span>
                  </div>
                )}
                {syncStatus.failed > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-500 dark:text-red-400">Operaciones fallidas:</span>
                    <span className="font-bold text-red-500 dark:text-red-400">{syncStatus.failed}</span>
                  </div>
                )}
              </div>
            )}

            {/* Acciones */}
            <div className="flex gap-2">
              {syncStatus.failed > 0 ? (
                <>
                  <button
                    onClick={handleRetryFailed}
                    disabled={!isOnline}
                    className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
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
                  className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-md shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", syncStatus.syncing && "animate-spin")} />
                  <span>{syncStatus.syncing ? "Sincronizando..." : "Sincronizar Ahora"}</span>
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
