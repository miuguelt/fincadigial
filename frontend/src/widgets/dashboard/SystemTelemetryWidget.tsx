import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import {
  RefreshCw,
  Cpu,
  HardDrive,
  Database,
  Wifi,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Tag,
  Globe,
  Zap,
  Server,
} from "lucide-react";
import { apiFetch } from "@/shared/api/apiFetch";
import { cn } from "@/shared/ui/cn.ts";

interface SystemHealth {
  status: string;
  database: "online" | "offline";
  redis?: "online" | "offline";
  celery_workers?: number;
  version?: string;
  uptime_seconds?: number;
  environment?: string;
  self_healing?: {
    status: string;
    actions_taken: string[];
    timestamp: string;
  };
}

const formatUptime = (seconds?: number) => {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

// ─── Tarjeta de servicio ──────────────────────────────────────────────────────
interface ServiceCardProps {
  label: string;
  icon: React.ReactNode;
  status: "online" | "offline" | "warning" | "unconfigured" | "loading";
  detail?: string;
}

const statusConfig = {
  online: {
    dot: "bg-emerald-500",
    ring: "ring-emerald-500/20",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-200 dark:border-emerald-800/50",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Online",
    icon: CheckCircle2,
  },
  offline: {
    dot: "bg-red-500",
    ring: "ring-red-500/20",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-800/50",
    text: "text-red-700 dark:text-red-400",
    label: "Offline",
    icon: XCircle,
  },
  warning: {
    dot: "bg-amber-500",
    ring: "ring-amber-500/20",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-800/50",
    text: "text-amber-700 dark:text-amber-400",
    label: "Error",
    icon: AlertCircle,
  },
  unconfigured: {
    dot: "bg-slate-400",
    ring: "ring-slate-400/20",
    bg: "bg-slate-50 dark:bg-slate-900/30",
    border: "border-slate-200 dark:border-slate-700/50",
    text: "text-slate-500 dark:text-slate-400",
    label: "Sin configurar",
    icon: AlertCircle,
  },
  loading: {
    dot: "bg-slate-300 animate-pulse",
    ring: "ring-slate-300/20",
    bg: "bg-slate-50 dark:bg-slate-900/20",
    border: "border-slate-200 dark:border-slate-700/40",
    text: "text-slate-400 dark:text-slate-500",
    label: "Verificando…",
    icon: RefreshCw,
  },
};

const ServiceCard: React.FC<ServiceCardProps> = ({
  label,
  icon,
  status,
  detail,
}) => {
  const cfg = statusConfig[status];
  const StatusIcon = cfg.icon;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border p-4 transition-all duration-200",
        cfg.bg,
        cfg.border
      )}
    >
      {/* Encabezado: ícono del servicio + nombre */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/70 dark:bg-black/20 shadow-sm">
          {icon}
        </span>
        <span className="text-sm font-semibold text-foreground">{label}</span>
      </div>

      {/* Estado con punto pulsante + texto */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "h-2.5 w-2.5 rounded-full ring-4 flex-shrink-0",
            cfg.dot,
            cfg.ring
          )}
        />
        <span className={cn("text-sm font-bold", cfg.text)}>{cfg.label}</span>
      </div>

      {/* Detalle opcional */}
      {detail && (
        <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
      )}

      {/* Ícono de estado en esquina inferior */}
      <div className="flex justify-end">
        <StatusIcon
          className={cn(
            "h-4 w-4",
            cfg.text,
            status === "loading" && "animate-spin"
          )}
        />
      </div>
    </div>
  );
};

// ─── Fila de metadata ─────────────────────────────────────────────────────────
interface MetaRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

const MetaRow: React.FC<MetaRowProps> = ({ icon, label, value, highlight }) => (
  <div
    className={cn(
      "flex items-center gap-3 rounded-lg border px-4 py-3",
      highlight
        ? "bg-primary/5 border-primary/20"
        : "bg-card border-border"
    )}
  >
    <span className="flex-shrink-0 text-muted-foreground">{icon}</span>
    <span className="flex-1 text-sm text-muted-foreground font-medium">
      {label}
    </span>
    <span
      className={cn(
        "text-sm font-bold font-mono",
        highlight ? "text-primary" : "text-foreground"
      )}
    >
      {value}
    </span>
  </div>
);

// ─── Barra de progreso de recursos ───────────────────────────────────────────
interface ResourceBarProps {
  label: string;
  icon: React.ReactNode;
  value: number;
}

const getBarColor = (pct: number) => {
  if (pct > 85) return "bg-red-500";
  if (pct > 70) return "bg-amber-500";
  return "bg-emerald-500";
};

const getBarTextColor = (pct: number) => {
  if (pct > 85) return "text-red-600 dark:text-red-400";
  if (pct > 70) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
};

const ResourceBar: React.FC<ResourceBarProps> = ({ label, icon, value }) => (
  <div className="rounded-xl border border-border bg-card p-4 space-y-3">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {label}
      </div>
      <span className={cn("text-lg font-black tabular-nums", getBarTextColor(value))}>
        {value}%
      </span>
    </div>
    <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
      <div
        className={cn(
          "h-full rounded-full transition-all duration-700",
          getBarColor(value)
        )}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
    <p className="text-xs text-muted-foreground">
      {value > 85
        ? "⚠ Uso crítico — revisar procesos"
        : value > 70
          ? "Uso moderado"
          : "Uso normal"}
    </p>
  </div>
);

// ─── Componente principal ─────────────────────────────────────────────────────
const SystemTelemetryWidget: React.FC = () => {
  const [health, setHealth] = useState<
    (SystemHealth & { resources?: { cpu: number; memory: number } }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch({ url: "/health", method: "GET" } as any);
      const data = res?.data ?? res;
      setHealth({
        status: data?.status ?? "unknown",
        database:
          data?.database_status === "connected" ? "online" : "offline",
        redis:
          data?.redis === "ok"
            ? "online"
            : data?.redis === "unavailable"
              ? "offline"
              : undefined,
        celery_workers: data?.celery_workers,
        version: data?.version ?? "1.0.0",
        uptime_seconds: data?.uptime_seconds,
        environment: data?.environment ?? import.meta.env.MODE,
        resources: data?.system_resources,
      });
    } catch {
      setHealth(
        (prev) =>
          prev ?? {
            status: "error",
            database: "offline",
            redis: "offline",
            environment: import.meta.env.MODE,
          }
      );
    } finally {
      setLoading(false);
      setLastChecked(new Date());
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const isHealthy =
    health?.status === "ok" || health?.status === "healthy";

  // Resolución de estado de cada servicio
  const apiStatus = loading
    ? "loading"
    : isHealthy
      ? "online"
      : "warning";

  const dbStatus = loading
    ? "loading"
    : (health?.database ?? "offline");

  const redisStatus: ServiceCardProps["status"] = loading
    ? "loading"
    : health?.redis === undefined
      ? "unconfigured"
      : health.redis;

  const workersStatus: ServiceCardProps["status"] = loading
    ? "loading"
    : health?.celery_workers !== undefined
      ? "online"
      : "unconfigured";

  const envLabel = health?.environment ?? "—";
  const isDevEnv =
    envLabel === "development" || envLabel === "dev";

  return (
    <Card className="border-border shadow-sm">
      {/* ── Encabezado ── */}
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2.5 text-xl font-black">
              <Server className="h-5 w-5 text-primary" />
              Estado del Sistema
              {/* Indicador de salud global */}
              <span
                className={cn(
                  "inline-flex h-2.5 w-2.5 rounded-full",
                  loading
                    ? "bg-slate-400 animate-pulse"
                    : isHealthy
                      ? "bg-emerald-500 animate-pulse"
                      : "bg-red-500 animate-pulse"
                )}
              />
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
              Monitoreo en tiempo real de la infraestructura
              {lastChecked && (
                <span className="text-muted-foreground">
                  · Actualizado:{" "}
                  <span className="font-semibold tabular-nums">
                    {lastChecked.toLocaleTimeString("es-CO", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </span>
              )}
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchHealth}
            disabled={loading}
            className="h-9 gap-2 flex-shrink-0"
          >
            <RefreshCw
              className={cn("h-4 w-4", loading && "animate-spin")}
            />
            <span className="hidden sm:inline text-sm">
              {loading ? "Actualizando…" : "Actualizar"}
            </span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* ── 1. Servicios ── */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Servicios
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <ServiceCard
              label="API"
              icon={<Wifi className="h-4 w-4 text-sky-600" />}
              status={apiStatus}
              detail={isHealthy ? "Respondiendo correctamente" : "Sin respuesta del servidor"}
            />
            <ServiceCard
              label="Base de Datos"
              icon={<Database className="h-4 w-4 text-indigo-600" />}
              status={dbStatus}
              detail={
                dbStatus === "online"
                  ? "Conexión activa"
                  : "No se puede conectar"
              }
            />
            <ServiceCard
              label="Redis"
              icon={<HardDrive className="h-4 w-4 text-rose-600" />}
              status={redisStatus}
              detail={
                redisStatus === "unconfigured"
                  ? "Caché no habilitada"
                  : redisStatus === "online"
                    ? "Caché operativa"
                    : "Caché no disponible"
              }
            />
            <ServiceCard
              label="Workers"
              icon={<Zap className="h-4 w-4 text-amber-600" />}
              status={workersStatus}
              detail={
                health?.celery_workers !== undefined
                  ? `${health.celery_workers} worker${health.celery_workers !== 1 ? "s" : ""} activo${health.celery_workers !== 1 ? "s" : ""}`
                  : "Sin workers configurados"
              }
            />
          </div>
        </div>

        {/* ── 2. Recursos (si están disponibles) ── */}
        {health?.resources && (
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              Recursos del Servidor
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResourceBar
                label="CPU"
                icon={<Cpu className="h-4 w-4" />}
                value={health.resources.cpu}
              />
              <ResourceBar
                label="Memoria RAM"
                icon={<HardDrive className="h-4 w-4" />}
                value={health.resources.memory}
              />
            </div>
          </div>
        )}

        {/* ── 3. Metadata ── */}
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Información del Sistema
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <MetaRow
              icon={<Tag className="h-4 w-4" />}
              label="Versión"
              value={health?.version ?? "—"}
            />
            <MetaRow
              icon={<Globe className="h-4 w-4" />}
              label="Entorno"
              value={envLabel}
              highlight={isDevEnv}
            />
            <MetaRow
              icon={<Clock className="h-4 w-4" />}
              label="Uptime"
              value={formatUptime(health?.uptime_seconds)}
            />
          </div>
        </div>

        {/* ── 4. Auto-reparación ── */}
        {health?.self_healing && (
          <div className="rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">
                <RefreshCw className="h-3.5 w-3.5" />
                Log de Autorreparación
              </h4>
              <span className="rounded-md border border-blue-200 dark:border-blue-800 bg-white/60 dark:bg-blue-900/20 px-2 py-0.5 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                Auto-habilitado
              </span>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado último ciclo:</span>
                <span
                  className={cn(
                    "font-bold uppercase text-xs",
                    health.self_healing.status === "healthy"
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}
                >
                  {health.self_healing.status}
                </span>
              </div>

              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground flex-shrink-0">Acciones:</span>
                <div className="flex flex-wrap gap-1.5 justify-end">
                  {health.self_healing.actions_taken.length > 0 ? (
                    health.self_healing.actions_taken.map((action, i) => (
                      <span
                        key={i}
                        className="rounded-md bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-700 dark:text-blue-300"
                      >
                        {action}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground italic">
                      Ninguna — sistema estable
                    </span>
                  )}
                </div>
              </div>

              <p className="text-right text-[11px] text-muted-foreground pt-1">
                Última verificación:{" "}
                {new Date(health.self_healing.timestamp).toLocaleString(
                  "es-CO",
                  { dateStyle: "short", timeStyle: "short" }
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SystemTelemetryWidget;
