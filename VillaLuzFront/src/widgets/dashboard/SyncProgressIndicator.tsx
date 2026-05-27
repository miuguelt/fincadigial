import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw, CircleCheck } from "lucide-react";
import { cn } from "@/shared/ui/cn";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";

/**
 * SyncProgressIndicator
 *
 * Componente que muestra el estado de sincronización de la cola offline.
 * Proporciona feedback visual premium sobre cuántos registros están pendientes
 * de enviarse al servidor.
 */
export const SyncProgressIndicator: React.FC = () => {
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncStatus, setLastSyncStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  useEffect(() => {
    // Monitorear estado de red
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitorear cola offline
    const updateCount = () => {
      offlineQueue
        .getPendingCount()
        .then((count) => setPendingCount(count))
        .catch(() => {});
    };

    updateCount();
    const interval = setInterval(updateCount, 3000);

    // Escuchar mensajes del Service Worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "OFFLINE_SYNC_SUCCESS") {
        setLastSyncStatus("success");
        setTimeout(() => setLastSyncStatus("idle"), 3000);
        updateCount();
      }
      if (event.data?.type === "BACKGROUND_SYNC_TRIGGERED") {
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 5000);
      }
    };

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", handleMessage);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.removeEventListener("message", handleMessage);
      }
    };
  }, []);

  if (pendingCount === 0 && isOnline && lastSyncStatus === "idle") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className={cn(
          "fixed bottom-20 right-4 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-lg border px-3 py-2 shadow-2xl backdrop-blur-xl transition-all duration-500 sm:bottom-24 sm:right-6 sm:gap-3 sm:px-4 sm:py-3",
          !isOnline
            ? "bg-warning/90 border-amber-400 text-white"
            : lastSyncStatus === "success"
              ? "bg-emerald-600/90 border-emerald-400 text-white"
              : "bg-primary/90 border-primary/20 text-white",
        )}
      >
        <div className="relative">
          {isOnline ? (
            isSyncing || pendingCount > 0 ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : lastSyncStatus === "success" ? (
              <CircleCheck className="w-5 h-5" />
            ) : (
              <Cloud className="w-5 h-5" />
            )
          ) : (
            <CloudOff className="w-5 h-5 animate-pulse" />
          )}

          {pendingCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-destructive text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
              {pendingCount}
            </span>
          )}
        </div>

        <div className="flex flex-col">
          <span className="text-[11px] font-semibold text-sm opacity-80 leading-none mb-1">
            Sincronización
          </span>
          <span className="text-xs font-bold leading-none">
            {!isOnline
              ? "Modo Offline (En espera)"
              : pendingCount > 0
                ? `Subiendo ${pendingCount} registros...`
                : lastSyncStatus === "success"
                  ? "Datos sincronizados"
                  : "Conexión estable"}
          </span>
        </div>

        {pendingCount > 0 && isOnline && (
          <div className="ml-2 w-12 h-1.5 bg-card/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-card"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
