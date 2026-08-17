/**
 * MCPStatusWidget
 *
 * Widget del dashboard que muestra el estado de los servicios MCP de DevBrain.
 * Usa el cliente resiliente para mostrar si MCPs están disponibles o usando fallback.
 *
 * Este es un componente de ejemplo para demostrar la integración del sistema
 * de alta disponibilidad MCP.
 */

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Server,
  ServerOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMCPResilient, useMCPHealth } from "@/shared/hooks/useMCPResilient";
// Componentes UI no disponibles - usando elementos HTML estándar

interface HealthData {
  status: string;
  services: {
    database: string;
  };
  timestamp: string;
  uptime_seconds: number;
}

/**
 * Widget de estado de salud del sistema usando MCP con fallback
 */
export const MCPStatusWidget: React.FC = () => {
  // Hook para obtener estado general de MCPs
  const { allStatus, anyAvailable, allInFallback, refresh } = useMCPHealth();

  // Hook para obtener datos de salud del backend (con fallback)
  const {
    data: healthData,
    isLoading,
    error,
    source,
    execute,
    retry,
    lastDuration,
  } = useMCPResilient<HealthData>({
    mcpName: "devbrain-universal",
    toolName: "dashboard_status",
    fallbackFn: async () => {
      // Fallback: obtener health directamente de la API
      const response = await fetch("/api/v1/health");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    },
    autoExecute: true,
    timeout: 10000,
  });

  const handleRefresh = () => {
    refresh();
    execute();
  };

  const getStatusColor = (available?: boolean) => {
    if (available === undefined) return "bg-secondary";
    return available ? "bg-emerald-500" : "bg-destructive";
  };

  const getStatusIcon = (available?: boolean) => {
    if (available === undefined)
      return <Activity className="w-4 h-4 text-muted-foreground" />;
    return available ? (
      <CheckCircle className="w-4 h-4 text-emerald-500" />
    ) : (
      <AlertTriangle className="w-4 h-4 text-destructive" />
    );
  };

  return (
    <div className="w-full bg-card rounded-xl border border-border shadow-sm">
      <div className="flex flex-row items-center justify-between p-4 border-b border-border/50">
        <h3 className="text-sm font-medium flex items-center gap-2 text-foreground">
          <Server className="w-4 h-4" />
          Estado del Ecosistema
        </h3>
        <button
          className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCw
            className={`w-4 h-4 text-muted-foreground ${isLoading ? "animate-spin" : ""}`}
          />
        </button>
      </div>

      <div className="p-4">
        {/* Indicador de fuente de datos */}
        <AnimatePresence mode="wait">
          <motion.div
            key={source || "none"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`mb-4 px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2 ${
              source === "mcp"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : source === "fallback"
                  ? "bg-warning/5 text-warning border border-amber-200"
                  : "bg-muted/50 text-muted-foreground border border-border"
            }`}
          >
            {source === "mcp" ? (
              <>
                <Server className="w-3 h-3" />
                Usando MCP DevBrain ({lastDuration}ms)
              </>
            ) : source === "fallback" ? (
              <>
                <Wifi className="w-3 h-3" />
                Usando API REST directa ({lastDuration}ms)
              </>
            ) : (
              <>
                <Activity className="w-3 h-3 animate-pulse" />
                Cargando...
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Estado de MCPs individuales */}
        <div className="space-y-2 mb-4">
          {Object.entries(allStatus).map(([name, status]) => (
            <div
              key={name}
              className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                {getStatusIcon(status?.available)}
                <span className="text-sm font-medium">
                  {name === "devbrain-universal"
                    ? "DevBrain Universal"
                    : name === "devbrain-skill-test-skill-v2"
                      ? "Skill Test"
                      : name}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${getStatusColor(status?.available)}`}
                />
                <span className="text-xs text-muted-foreground">
                  {status?.available
                    ? "Disponible"
                    : status?.fallbackActive
                      ? "Fallback"
                      : "No disponible"}
                </span>
              </div>
            </div>
          ))}

          {Object.keys(allStatus).length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              No hay MCPs configurados
            </div>
          )}
        </div>

        {/* Datos de health del backend */}
        {healthData && !error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="border-t pt-4"
          >
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Backend VillaLuz
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-xs text-muted-foreground">Estado</p>
                <p
                  className={`text-sm font-semibold ${
                    healthData.status === "healthy"
                      ? "text-emerald-600"
                      : "text-destructive"
                  }`}
                >
                  {healthData.status === "healthy"
                    ? "Saludable"
                    : healthData.status}
                </p>
              </div>
              <div className="bg-muted/50 p-2 rounded">
                <p className="text-xs text-muted-foreground">Base de Datos</p>
                <p
                  className={`text-sm font-semibold ${
                    healthData.services?.database === "healthy"
                      ? "text-emerald-600"
                      : "text-destructive"
                  }`}
                >
                  {healthData.services?.database === "healthy"
                    ? "Conectada"
                    : "Error"}
                </p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Última actualización:{" "}
              {new Date(healthData.timestamp).toLocaleTimeString('es-CO')}
            </p>
          </motion.div>
        )}

        {/* Error state */}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 p-3 bg-destructive/5 border border-destructive/30 rounded-lg"
          >
            <div className="flex items-start gap-2">
              <ServerOff className="w-4 h-4 text-destructive mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  Error de conexión
                </p>
                <p className="text-xs text-destructive mt-1">{error}</p>
              </div>
            </div>
            <button
              className="mt-2 w-full px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted/50 transition-colors flex items-center justify-center gap-1"
              onClick={retry}
            >
              <RefreshCw className="w-3 h-3" />
              Reintentar
            </button>
          </motion.div>
        )}

        {/* Footer info */}
        <div className="mt-4 pt-3 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {anyAvailable
                ? "Sistema MCP operativo"
                : allInFallback
                  ? "Usando modo fallback"
                  : "MCPs no configurados"}
            </span>
            <span className="flex items-center gap-1">
              {anyAvailable ? (
                <Wifi className="w-3 h-3" />
              ) : (
                <WifiOff className="w-3 h-3" />
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Versión compacta del widget para usar en header/toolbar
 */
export const MCPStatusIndicator: React.FC = () => {
  const { anyAvailable, allInFallback } = useMCPHealth();

  if (anyAvailable) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 rounded-full">
        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-emerald-700">MCP</span>
      </div>
    );
  }

  if (allInFallback) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 bg-warning/5 rounded-full">
        <Wifi className="w-3 h-3 text-warning" />
        <span className="text-xs font-medium text-warning">API</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-full">
      <ServerOff className="w-3 h-3 text-muted-foreground" />
      <span className="text-xs font-medium text-muted-foreground">--</span>
    </div>
  );
};

export default MCPStatusWidget;
