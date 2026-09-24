import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  IconActivity,
  IconAlertTriangle,
  IconMapPin,
  IconRefresh,
  IconSyringe,
  IconWifi,
  IconWifiOff,
} from "@/shared/ui/icons";
import { useCompleteDashboardStats, getStatValue } from "@/features/dashboard/model/useCompleteDashboardStats";
import { subscribeSSE, getSSEStatus } from "@/lib/events";

interface LiveKPIs {
  total_animals: number;
  active_animals: number;
  sick_animals: number;
  health_rate: number;
  vaccinations_30d: number;
  active_treatments: number;
  controls_7d: number;
}

export function LiveStats() {
  const { stats, loading, error, refetch, lastUpdated } = useCompleteDashboardStats(true);
  const [sseConnected, setSseConnected] = useState(() => getSSEStatus().connected);

  useEffect(() => {
    // Sincronizar estado inicial
    setSseConnected(getSSEStatus().connected);

    // Suscribirse a los eventos unificados del bus SSE
    const unsubscribe = subscribeSSE((_eventData) => {
      setSseConnected(true);
      // Cuando llega un evento de negocio por SSE, refrescar silenciosamente las métricas
      refetch().catch(() => {});
    });

    const statusInterval = setInterval(() => {
      setSseConnected(getSSEStatus().connected);
    }, 5000);

    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, [refetch]);

  const formatNumber = (num: number) =>
    new Intl.NumberFormat("es-CO").format(num);

  const kpis: LiveKPIs = useMemo(() => {
    const total_animals = getStatValue(stats?.animales_registrados);
    const active_animals = getStatValue(stats?.animales_activos);
    const sick_animals = getStatValue(stats?.animales_por_enfermedad);
    const health_rate =
      total_animals > 0
        ? Math.max(0, Math.min(100, Math.round(((total_animals - sick_animals) / total_animals) * 100)))
        : 100;
    const vaccinations_30d = getStatValue(stats?.vacunas_aplicadas);
    const active_treatments = getStatValue(stats?.tratamientos_activos);
    const controls_7d = getStatValue(stats?.controles_realizados);

    return {
      total_animals,
      active_animals,
      sick_animals,
      health_rate,
      vaccinations_30d,
      active_treatments,
      controls_7d,
    };
  }, [stats]);

  const kpiCards = [
    {
      key: "active_animals",
      label: "Animales Activos",
      icon: IconActivity,
      color: "text-success",
      bgColor: "bg-success-50 border-success-200",
    },
    {
      key: "sick_animals",
      label: "Enfermos",
      icon: IconAlertTriangle,
      color: "text-destructive",
      bgColor: "bg-danger-50 border-danger-200",
    },
    {
      key: "health_rate",
      label: "Tasa de Salud",
      icon: IconActivity,
      color: "text-info",
      bgColor: "bg-info-50 border-info-200",
      suffix: "%",
    },
    {
      key: "vaccinations_30d",
      label: "Vacunas",
      icon: IconSyringe,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      key: "active_treatments",
      label: "Tratamientos Activos",
      icon: IconRefresh,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      key: "controls_7d",
      label: "Controles Realizados",
      icon: IconMapPin,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ];

  return (
    <Card premium={false} hoverable={false} className="w-full shadow-sm">
      <CardHeader className="flex flex-col gap-4 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <CardTitle className="flex items-center gap-3 text-lg font-bold sm:text-xl">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-700">
            <IconActivity size="md" />
          </span>
          Estadísticas en tiempo real
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {sseConnected ? (
            <Badge
              variant="default"
              className="bg-success-600 px-3 py-1 text-white hover:bg-success-600"
            >
              <IconWifi size="sm" className="mr-1" />
              En vivo
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
              <IconWifiOff size="sm" className="mr-1" />
              Desconectado
            </Badge>
          )}
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">
              {lastUpdated.toLocaleTimeString("es-CO")}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-5 sm:p-6">
        {error && !stats ? (
          <div className="p-4 bg-destructive/5 text-destructive rounded-lg text-sm">
            Error cargando estadísticas: {error.message}
          </div>
        ) : loading && !stats ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <IconRefresh size="md" className="mr-2 animate-spin" />
            Cargando estadísticas...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-3 lg:gap-4">
            {kpiCards.map((kpi) => {
              const value = kpis[kpi.key as keyof LiveKPIs];
              return (
                <div
                  key={kpi.key}
                  className={`rounded-xl border p-4 transition-shadow hover:shadow-sm sm:p-5 ${kpi.bgColor}`}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <kpi.icon size="sm" className={kpi.color} />
                    <span className="text-sm font-semibold text-neutral-700">
                      {kpi.label}
                    </span>
                  </div>
                  <div className={`text-2xl font-bold tracking-tight sm:text-3xl ${kpi.color}`}>
                    {typeof value === "number" ? formatNumber(value) : "-"}
                    {kpi.suffix || ""}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
