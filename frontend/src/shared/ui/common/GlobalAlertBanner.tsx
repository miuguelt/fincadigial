import React from "react";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconWifiOff,
  IconRefresh,
  IconAlertCircle,
  IconCircleCheck,
  IconX,
} from "@/shared/ui/icons";
import { cn } from "@/shared/lib/utils";
import { offlineQueue } from "@/shared/api/offline/offlineQueue";

export const GlobalAlertBanner: React.FC = () => {
  const { isOnline, pendingOperations, syncStatus } = useOnlineStatus();
  const [isVisible, setIsVisible] = React.useState(true);

  // Determinar la alerta más importante
  const getAlert = () => {
    if (!isOnline) {
      return {
        id: "offline",
        type: "warning",
        icon: IconWifiOff,
        title: "Modo Offline Activo",
        message:
          pendingOperations > 0
            ? `Tienes ${pendingOperations} cambios guardados localmente. Se sincronizarán al recuperar conexión.`
            : "Estás trabajando sin internet. Los cambios se guardarán en tu dispositivo.",
        color: "bg-amber-500",
        textColor: "text-amber-950",
        lightColor: "bg-amber-50",
      };
    }
    if (syncStatus.failed > 0) {
      return {
        id: "sync-failed",
        type: "error",
        icon: IconAlertCircle,
        title: "Error de Sincronización",
        message: `${syncStatus.failed} operaciones no se pudieron completar. Revisa tu conexión.`,
        color: "bg-rose-500",
        textColor: "text-rose-950",
        lightColor: "bg-rose-50",
        action: {
          label: "Reintentar",
          onClick: () => offlineQueue.retryFailedOperations(),
        },
      };
    }
    if (syncStatus.syncing) {
      return {
        id: "syncing",
        type: "info",
        icon: IconRefresh,
        title: "Sincronizando Datos",
        message: `Subiendo ${syncStatus.pending} cambios al servidor...`,
        color: "bg-blue-500",
        textColor: "text-blue-950",
        lightColor: "bg-blue-50",
        isAnimating: true,
      };
    }
    return null;
  };

  const alert = getAlert();
  if (!alert || !isVisible) return null;

  const AlertIcon = alert.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className={cn(
          "relative overflow-hidden border-b transition-colors duration-500",
          alert.lightColor,
          "border-black/5 dark:border-white/5"
        )}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-4">
          <div
            className={cn(
              "flex-shrink-0 p-2 rounded-xl text-white shadow-sm",
              alert.color
            )}
          >
            <AlertIcon
              size="sm"
              className={cn(alert.isAnimating && "animate-spin")}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className={cn("text-xs font-black uppercase tracking-widest", alert.textColor)}>
              {alert.title}
            </h4>
            <p className={cn("text-sm font-medium opacity-80 truncate", alert.textColor)}>
              {alert.message}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {alert.action && (
              <button
                onClick={alert.action.onClick}
                className={cn(
                  "px-3 py-1 rounded-lg text-xs font-black uppercase tracking-tighter transition-all",
                  "bg-black/10 hover:bg-black/20",
                  alert.textColor
                )}
              >
                {alert.action.label}
              </button>
            )}
            <button
              onClick={() => setIsVisible(false)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                "hover:bg-black/10",
                alert.textColor
              )}
            >
              <IconX size="sm" />
            </button>
          </div>
        </div>
        {/* Barra de progreso sutil si está sincronizando */}
        {alert.isAnimating && (
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-600 origin-left opacity-30"
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
