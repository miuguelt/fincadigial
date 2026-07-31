import { useState, useEffect, useCallback, useRef } from 'react';
import { analyticsService } from '@/features/reporting/api/analytics.service';

export interface StatTrend {
  periodo_actual: number;
  periodo_anterior: number;
}

export interface KpiTrend {
  periodo_actual: number;
  periodo_anterior: number;
  ventana_dias?: number;
}

export interface KpiCardSummary {
  id: string;
  titulo: string;
  valor: number;
  unidad?: string;
  cambio?: number;
  tendencia?: KpiTrend;
  icono?: string;
  descripcion?: string;
  detalle?: Record<string, any>;
}

export interface KpiResumen {
  ventana_dias: number;
  cards: KpiCardSummary[];
}

export interface DashboardStat {
  valor: number;
  /**
   * Desglose de altas recientes para el periodo actual (últimos 30 días)
   * y el periodo inmediatamente anterior (30-60 días).
   * Campo opcional: no todas las métricas lo incluyen.
   */
  tendencia?: StatTrend;
  cambio_porcentual?: number;
  desglose?: Record<string, any>;
}

export interface CompleteDashboardStats {
  // Usuarios
  usuarios_registrados: DashboardStat;
  usuarios_activos: DashboardStat;

  // Animales
  animales_registrados: DashboardStat;
  animales_activos: DashboardStat;

  // Tratamientos
  tratamientos_totales: DashboardStat;
  tratamientos_activos: DashboardStat;

  // Alertas y Tareas
  tareas_pendientes: DashboardStat;
  alertas_sistema: DashboardStat;

  // Vacunas y Controles
  vacunas_aplicadas: DashboardStat;
  controles_realizados: DashboardStat;
  campos_registrados: DashboardStat;

  // Catálogos
  catalogo_vacunas: DashboardStat;
  catalogo_medicamentos: DashboardStat;
  catalogo_enfermedades: DashboardStat;
  catalogo_especies: DashboardStat;
  catalogo_razas: DashboardStat;
  catalogo_tipos_alimento: DashboardStat;

  // Relaciones
  animales_por_campo: DashboardStat;
  animales_por_enfermedad: DashboardStat;

  // Mejoras y Tratamientos
  mejoras_geneticas: DashboardStat;
  tratamientos_medicamentos: DashboardStat;
  tratamientos_vacunas: DashboardStat;

  // KPIs agregados (ventana móvil)
  kpi_resumen?: KpiResumen;
  health_trend?: Array<{ name: string; value: number }>;
}

interface UseCompleteDashboardStatsResult {
  stats: CompleteDashboardStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

/**
 * Hook optimizado para obtener todas las estadísticas del dashboard
 * en una sola llamada HTTP. Incluye auto-refresh cada 2 minutos
 * para aprovechar el caché del backend.
 */
export function useCompleteDashboardStats(
  autoRefresh: boolean = true,
  refreshInterval: number = 120000 // 2 minutos (mismo que el caché del backend)
): UseCompleteDashboardStatsResult {
  const [stats, setStats] = useState<CompleteDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasStatsRef = useRef(false);

  const fetchStats = useCallback(async () => {
    try {
      // Keep stale data visible while reconnecting; only show the spinner on
      // the first load of a device.
      setLoading(!hasStatsRef.current);
      setError(null);

      const data = await analyticsService.getCompleteDashboardStats();

      setStats(data);
      hasStatsRef.current = true;
      setLastUpdated(new Date());
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Error desconocido');
      if (typeof navigator === 'undefined' || navigator.onLine !== false) {
        console.error('Error fetching complete dashboard stats:', nextError);
      }
      setError(nextError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const refreshWhenVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState !== 'hidden') {
        void fetchStats();
      }
    };

    // Load immediately. The API client serves IndexedDB when offline and
    // fails fast when no local snapshot exists.
    refreshWhenVisible();

    const handleOnline = () => refreshWhenVisible();
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', refreshWhenVisible);

    // Refresh only while the tab is visible to avoid wasting rural data.
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      intervalId = setInterval(() => {
        refreshWhenVisible();
      }, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
    };
  }, [fetchStats, autoRefresh, refreshInterval]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    lastUpdated,
  };
}

/**
 * Función helper para obtener el valor de una estadística
 * con un valor por defecto si no existe
 */
export function getStatValue(
  stat: DashboardStat | undefined,
  defaultValue: number = 0
): number {
  return stat?.valor ?? defaultValue;
}

/**
 * Función helper para obtener el cambio porcentual
 * con formato de display
 */
export function getStatChange(
  stat: DashboardStat | undefined
): { value: number; isPositive: boolean; display: string } | null {
  if (!stat?.cambio_porcentual && stat?.cambio_porcentual !== 0) {
    return null;
  }

  const value = stat.cambio_porcentual;
  const isPositive = value >= 0;
  const display = `${isPositive ? '+' : ''}${value}%`;

  return { value, isPositive, display };
}

export default useCompleteDashboardStats;
