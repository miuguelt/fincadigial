import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Activity,
  AlertTriangle,
  Syringe,
  MapPin,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { getBackendBaseURL } from "@/shared/utils/envConfig";
import { getCookie } from "@/shared/utils/cookieUtils";

interface LiveKPIs {
  total_animals: number;
  active_animals: number;
  sick_animals: number;
  health_rate: number;
  vaccinations_30d: number;
  active_treatments: number;
  controls_7d: number;
}

interface LiveStatsData {
  timestamp: string;
  kpis: LiveKPIs;
  error?: string;
}

export function LiveStats() {
  const [stats, setStats] = useState<LiveStatsData | null>(null);
  const [connected, setConnected] = useState(false);
  // BUG FIX: Usar ref en vez de state para el contador de reintentos.
  // Si se usaba state, cada setRetryCount() recreaba `connect` (por su dep array),
  // lo que disparaba useEffect([connect]) → nueva conexión → loop infinito.
  const retryCountRef = useRef(0);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    // Guardián de montaje
    if (!mountedRef.current) return;

    // Singleton: no crear otra conexión si ya existe una activa
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const maxRetries = 5;
    if (retryCountRef.current >= maxRetries) {
      console.warn("[LiveStats] Límite de reconexiones alcanzado. SSE detenido.");
      return;
    }

    const baseURL = getBackendBaseURL();
    const url = `${baseURL}/api/v1/analytics/live/stream`;

    console.log(`[LiveStats] Conectando a SSE (intento ${retryCountRef.current + 1}):`, url);

    const es = new EventSource(url, { withCredentials: true });
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) { es.close(); return; }
      console.log("[LiveStats] Conexión SSE establecida");
      setConnected(true);
      retryCountRef.current = 0; // Reset al conectar exitosamente
    };

    es.onerror = () => {
      if (!mountedRef.current) { es.close(); return; }
      setConnected(false);
      es.close();
      esRef.current = null;

      retryCountRef.current += 1;
      const attempts = retryCountRef.current;

      if (attempts >= maxRetries) {
        console.warn(`[LiveStats] Sin más reconexiones tras ${maxRetries} intentos.`);
        return;
      }

      // Backoff exponencial: 2s, 4s, 8s, 16s, 30s
      const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
      console.log(`[LiveStats] Reintentando en ${delay / 1000}s (intento ${attempts + 1}/${maxRetries})`);

      reconnectTimeoutRef.current = setTimeout(connect, delay);
    };

    es.onmessage = (event) => {
      if (!mountedRef.current) return;
      try {
        const data: LiveStatsData = JSON.parse(event.data);
        setStats(data);
      } catch (err) {
        console.error("[LiveStats] Error parseando datos SSE:", err);
      }
    };
  }, []); // SIN dependencias externas — connect es estable durante todo el ciclo de vida

  useEffect(() => {
    mountedRef.current = true;
    connect();

    // Reconectar cuando la página vuelve a ser visible (tras cambio de tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !esRef.current) {
        console.log("[LiveStats] Página visible, reconectando...");
        retryCountRef.current = 0; // Reset al volver de background
        connect();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, []); // Solo mount/unmount

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("es-CO").format(num);

  const kpiCards = [
    {
      key: "active_animals",
      label: "Animales Activos",
      icon: Activity,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      key: "sick_animals",
      label: "Enfermos",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      key: "health_rate",
      label: "Tasa de Salud",
      icon: Activity,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      suffix: "%",
    },
    {
      key: "vaccinations_30d",
      label: "Vacunas (30d)",
      icon: Syringe,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      key: "active_treatments",
      label: "Tratamientos Activos",
      icon: RefreshCw,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      key: "controls_7d",
      label: "Controles (7d)",
      icon: MapPin,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Estadísticas en Tiempo Real
        </CardTitle>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge
              variant="default"
              className="bg-green-100 text-green-800 hover:bg-green-100"
            >
              <Wifi className="h-3 w-3 mr-1" />
              En vivo
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-gray-100 text-gray-600">
              <WifiOff className="h-3 w-3 mr-1" />
              Desconectado
            </Badge>
          )}
          {stats?.timestamp && (
            <span className="text-xs text-muted-foreground">
              {new Date(stats.timestamp).toLocaleTimeString("es-CO")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {stats?.error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm">
            Error: {stats.error}
          </div>
        ) : stats?.kpis ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {kpiCards.map((kpi) => {
              const value = stats.kpis[kpi.key as keyof LiveKPIs];
              const Icon = kpi.icon;

              return (
                <div
                  key={kpi.key}
                  className={`p-4 rounded-lg ${kpi.bgColor} transition-all hover:scale-105`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`h-4 w-4 ${kpi.color}`} />
                    <span className="text-sm font-medium text-gray-600">
                      {kpi.label}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold ${kpi.color}`}>
                    {typeof value === "number" ? formatNumber(value) : "-"}
                    {kpi.suffix || ""}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
            Cargando estadísticas...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
