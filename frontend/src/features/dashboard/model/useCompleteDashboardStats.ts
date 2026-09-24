import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/model/useAuth';
import { analyticsService } from '@/features/reporting/api/analytics.service';



/**
 * Hook optimizado para obtener todas las estadísticas del dashboard
 * usando TanStack Query (Stale-While-Revalidate).
 * Proporciona respuesta inmediata de 0ms al regresar al Dashboard y refresco silencioso en segundo plano.
 */
export function useCompleteDashboardStats(
  autoRefresh: boolean = true,
  refreshInterval: number = 120000 // 2 minutos (mismo que el caché del backend)
): UseCompleteDashboardStatsResult {
  const { user } = useAuth();
  const fincaId = user?.finca_id ?? 'all';

  const query = useQuery<CompleteDashboardStats>({
    queryKey: ['complete-dashboard-stats', fincaId],
    queryFn: () => analyticsService.getCompleteDashboardStats(),
    staleTime: 60 * 1000, // 1 minuto de datos frescos sin refetch
    gcTime: 30 * 60 * 1000, // 30 minutos de persistencia en memoria
    refetchInterval: autoRefresh ? refreshInterval : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
  });

  return {
    stats: query.data ?? null,
    loading: query.isLoading, // Solo true en primera carga sin datos en caché
    error: (query.error as Error) ?? null,
    refetch: async () => {
      await query.refetch();
    },
    lastUpdated: query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null,
  };
}

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
  valor: number | null;
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
  valor: number | null;
  /**
   * Desglose de altas recientes para el periodo actual (últimos 30 días)
   * y el periodo inmediatamente anterior (30-60 días).
   * Campo opcional: no todas las métricas lo incluyen.
   */
  tendencia?: StatTrend;
  cambio_porcentual?: number | null;
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
  health_trend?: Array<{ name: string; value: number | null }>;
}

interface UseCompleteDashboardStatsResult {
  stats: CompleteDashboardStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}
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
