import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download,
  CircleCheck,
  WifiOff,
  RefreshCw,
  Trash2,
  Zap,
  Package,
  Clock,
  CloudOff,
  CloudDownload,
} from "lucide-react";
import { useFieldReady } from "@/shared/hooks/useFieldReady";
import { useOnlineStatus } from "@/shared/hooks/useOnlineStatus";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(epoch: number | null): string {
  if (!epoch) return "Nunca";
  const diff = Date.now() - epoch;
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `hace ${h}h ${m}m`;
  if (m > 0) return `hace ${m}m`;
  return "Justo ahora";
}

// ─── Componente ──────────────────────────────────────────────────────────────

export const FieldReadyWidget: React.FC = () => {
  const { isOnline } = useOnlineStatus();
  const { status, progress, isPrefetching, startPrefetch, clearCache } =
    useFieldReady();

  const canDownload = isOnline && !isPrefetching;
  const pct = progress
    ? Math.round((progress.current / Math.max(progress.total, 1)) * 100)
    : 0;

  return (
    <div
      className="rounded-lg border-2 overflow-hidden shadow-lg"
      style={{
        borderColor: status.isReady
          ? "#10b981"
          : isOnline
            ? "#3b82f6"
            : "#f59e0b",
        background: status.isReady
          ? "linear-gradient(135deg,#ecfdf5,#d1fae5)"
          : isOnline
            ? "linear-gradient(135deg,#eff6ff,#dbeafe)"
            : "linear-gradient(135deg,#fffbeb,#fef3c7)",
      }}
    >
      {/* ── Header ── */}
      <div
        className="px-5 py-4 flex items-center justify-between"
        style={{
          background: status.isReady
            ? "#059669"
            : isOnline
              ? "#2563eb"
              : "#d97706",
        }}
      >
        <div className="flex items-center gap-3 text-white">
          {status.isReady ? (
            <CircleCheck className="h-7 w-7" />
          ) : isOnline ? (
            <CloudDownload className="h-7 w-7" />
          ) : (
            <CloudOff className="h-7 w-7" />
          )}
          <div>
            <p className="font-bold text-lg leading-none">
              {status.isReady ? "¡Listo para el campo!" : "Modo Campo"}
            </p>
            <p className="text-xs opacity-80 mt-0.5">
              {status.isReady
                ? "Datos disponibles sin internet"
                : isOnline
                  ? "Descarga los datos antes de salir"
                  : "Sin WiFi — datos del campo necesarios"}
            </p>
          </div>
        </div>
        {status.isReady && (
          <span className="bg-card/20 text-white text-xs font-bold px-3 py-1 rounded-full">
            Actualizado {formatTime(status.cachedAt)}
          </span>
        )}
      </div>

      {/* ── Cuerpo ── */}
      <div className="px-5 py-4 space-y-4">
        {/* Estado KPIs */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              icon: Package,
              label: "Registros",
              value: status.itemsCached > 0 ? String(status.itemsCached) : "—",
              color:
                status.itemsCached > 0 ? "text-emerald-700" : "text-muted-foreground",
            },
            {
              icon: WifiOff,
              label: "Pendientes",
              value: String(status.pendingSync),
              color:
                status.pendingSync > 0 ? "text-warning" : "text-muted-foreground",
            },
            {
              icon: Clock,
              label: "Vigencia",
              value: status.cachedAt ? "8h" : "—",
              color: status.isReady ? "text-emerald-700" : "text-muted-foreground",
            },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="bg-card/60 rounded-xl p-3 text-center shadow-sm"
            >
              <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
              <p className={`text-xl font-black ${color}`}>{value}</p>
              <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
            </div>
          ))}
        </div>

        {/* Barra de progreso durante descarga */}
        <AnimatePresence>
          {isPrefetching && progress && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex justify-between items-center text-sm font-medium text-foreground/80">
                <span className="flex items-center gap-1.5">
                  <RefreshCw className="h-4 w-4 animate-spin text-info" />
                  {progress.step}
                </span>
                <span className="text-info font-bold">{pct}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                <motion.div
                  className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Descargando recursos {progress.current}/{progress.total}...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mensaje offline sin caché */}
        {!isOnline && !status.isReady && (
          <div className="bg-warning/10 border border-amber-300 rounded-xl p-3 flex items-start gap-3">
            <WifiOff className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div className="text-sm text-warning">
              <strong>Todavía no ha bajado los datos.</strong> Conéctese a internet antes de 
              salir al potrero para que la información del ganado le quede guardada.
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={startPrefetch}
            disabled={!canDownload}
            className={[
              "flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95",
              canDownload
                ? "bg-info text-white shadow-lg shadow-blue-200 hover:bg-blue-700"
                : "bg-secondary text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            {isPrefetching ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <Download className="h-5 w-5" />
            )}
            {isPrefetching
              ? "Descargando..."
              : status.isReady
                ? "Actualizar datos"
                : "Preparar para el campo"}
          </button>

          {status.isReady && (
            <button
              onClick={clearCache}
              className="px-4 py-3.5 rounded-xl bg-muted text-muted-foreground hover:bg-secondary transition-all active:scale-95 font-medium"
              title="Limpiar caché de campo"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tip final */}
        <div className="flex items-start gap-2 bg-card/50 rounded-xl p-3 border border-white/80">
          <Zap className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            <strong>Consejo:</strong> Descarga los datos en casa o en el casco
            urbano. Los formularios de campo seguirán guardando tus registros
            aunque pierdas señal y se sincronizarán automáticamente al volver.
          </p>
        </div>
      </div>
    </div>
  );
};
