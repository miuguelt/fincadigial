import React, { useState, useEffect, useCallback, useRef, useMemo, Suspense, memo } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/shared/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import {
  Users,
  Building2,
  ClipboardList,
  AlertTriangle,
  CheckCircle,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Skull,
  ShoppingCart,
  Pill,
  ClipboardCheck,
  TrendingUp,
  ListChecks,
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Database,
  FileText,
  Gauge,
  MapPinned,
  RefreshCcw,
  Settings,
} from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
// OPTIMIZACIÓN: Lazy loading de pestañas pesadas → code splitting automático
const SystemTab = React.lazy(() => import('@/widgets/dashboard/SystemTab'));
const SettingsTab = React.lazy(() => import('@/widgets/dashboard/SettingsTab'));

import { usePermissions } from '@/shared/hooks/useJWT';
import { unwrapApi } from '@/shared/api/client';
import { apiFetch } from '@/shared/api/apiFetch';
import { useT } from '@/shared/i18n';
import axios from 'axios';
import { SkeletonCard } from '@/shared/ui/skeleton';
import { DashboardStatsCard, DashboardStatsGrid } from '@/widgets/dashboard/DashboardStatsCard';
import { useCompleteDashboardStats, KpiCardSummary, DashboardStat } from '@/features/dashboard/model/useCompleteDashboardStats';
import KPICard from '@/widgets/analytics/KPICard';
const AIInsightsWidget = React.lazy(() => import('@/widgets/dashboard/AIInsightsWidget').then(m => ({ default: m.AIInsightsWidget })));
const HeatAlertsWidget = React.lazy(() => import('@/widgets/reproduction/HeatAlertsWidget'));
import { UserCard } from '@/widgets/dashboard/UserCard';
import AlertsPanel from '@/widgets/analytics/AlertsPanel';
const RegulatoryReportsWidget = React.lazy(() => import('@/widgets/dashboard/RegulatoryReportsWidget'));
const FieldHealthMap = React.lazy(() => import('@/widgets/analytics/FieldHealthMap'));
import { ExternalLink } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

const KPI_ORDER = [
  'health_index',
  'vaccination_coverage',
  'control_compliance',
  'mortality_rate_30d',
  'sales_rate_30d',
  'treatments_intensity',
  'controls_frequency',
  'herd_growth_rate',
  'alert_pressure',
  'task_load_index',
];

const getStatValue = (stat?: DashboardStat | number | null) => {
  if (typeof stat === 'number') return stat;
  return stat?.valor ?? 0;
};

const formatLastUpdated = (date: Date | null) => {
  if (!date) return 'Sin actualizar';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const DashboardMetricPill = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: number;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
}) => {
  const toneConfig = {
    default: {
      card: 'bg-card/80 border-border/60',
      bar: 'bg-slate-400',
      value: 'text-foreground',
      label: 'text-muted-foreground',
    },
    success: {
      card: 'bg-emerald-50/80 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-800/40',
      bar: 'bg-emerald-500',
      value: 'text-emerald-800 dark:text-emerald-300',
      label: 'text-emerald-600/80 dark:text-emerald-400/70',
    },
    warning: {
      card: 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40',
      bar: 'bg-amber-500',
      value: 'text-amber-800 dark:text-amber-300',
      label: 'text-amber-600/80 dark:text-amber-400/70',
    },
    danger: {
      card: 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-800/40',
      bar: 'bg-rose-500',
      value: 'text-rose-800 dark:text-rose-300',
      label: 'text-rose-600/80 dark:text-rose-400/70',
    },
    info: {
      card: 'bg-sky-50/80 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-800/40',
      bar: 'bg-sky-500',
      value: 'text-sky-800 dark:text-sky-300',
      label: 'text-sky-600/80 dark:text-sky-400/70',
    },
  };

  const config = toneConfig[tone];

  return (
    <div className={cn('relative min-h-[90px] rounded-xl border overflow-hidden pl-4 pr-3 py-3 transition-all duration-200 hover:shadow-md', config.card)}>
      {/* Barra lateral de color */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', config.bar)} />
      <p className={cn('text-[10px] font-bold uppercase tracking-[0.1em] leading-4 mb-1.5', config.label)}>{label}</p>
      <p className={cn('text-2xl font-black leading-none tracking-tight tabular-nums sm:text-3xl', config.value)}>
        {value.toLocaleString('es-CO')}
      </p>
    </div>
  );
};

// OPTIMIZACIÓN: Componente de alerta memoizado para evitar re-renders innecesarios
const AlertItem = memo(({ alert, onMarkRead, onNavigate, colorToClasses, renderIcon }: {
  alert: SystemAlert;
  onMarkRead: (id: string) => void;
  onNavigate: (path: string) => void;
  colorToClasses: (color?: string) => string;
  renderIcon: (alert: SystemAlert) => React.ReactNode;
}) => (
  <div
    className={cn(
      "group relative flex items-start gap-4 p-4 rounded-lg border transition-all duration-300",
      colorToClasses(alert.color),
      alert.isRead ? "opacity-60 grayscale-[0.5]" : "shadow-sm hover:shadow-md hover:scale-[1.01]"
    )}
  >
    <div className="flex-shrink-0 mt-1">
      {renderIcon(alert)}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-sm font-bold text-foreground truncate">{alert.title}</h4>
        <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
          {new Date(alert.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {alert.message}
      </p>
      
      <div className="flex flex-wrap gap-2 items-center">
        {alert.priority && (
          <Badge variant="outline" className="text-[9px] uppercase tracking-tighter h-5 border-primary/20 text-primary bg-primary/5">
            {alert.priority}
          </Badge>
        )}
        {alert.animal_record && (
          <button 
            onClick={() => onNavigate(`/admin/animals?q=${encodeURIComponent(alert.animal_record || '')}`)}
            className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Building2 className="h-3 w-3" />
            {alert.animal_record}
          </button>
        )}
      </div>
    </div>
    {!alert.isRead && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onMarkRead(alert.id)}
        className="h-8 w-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        title="Marcar como leída"
      >
        <CheckCircle className="h-4 w-4" />
      </Button>
    )}
  </div>
));
AlertItem.displayName = 'AlertItem';

// Definición de tipos
interface User {
  id: number;
  username: string;
  role: string;
  email?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface SystemAlert {
  id: string;
  type: 'health' | 'vaccination' | 'growth' | 'productivity' | 'system' | 'info' | 'warning' | 'error' | 'success' | string;
  title: string;
  message: string;
  created_at: string;
  color?: 'red' | 'yellow' | 'green' | 'blue' | string;
  icon?: string; // emoji o nombre de icono
  priority?: 'low' | 'medium' | 'high' | 'critical';
  animal_id?: number;
  animal_record?: string;
  action_required?: string;
  isRead?: boolean;
}

const AdminDashboard: React.FC = () => {
  const t = useT();
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // Estado local - declarar PRIMERO antes de usar
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Guardas para evitar llamadas duplicadas/in-flight y doble invocación en StrictMode
  const initialFetchDoneRef = useRef(false)
  const isFetchingUsersRef = useRef(false)
  // Control de reintento único para /users
  const hasRetriedUsersRef = useRef(false)
  const usersRetryTimeoutRef = useRef<number | null>(null)

  // ===== Permisos evaluados como booleanos para estabilizar dependencias =====
  const canReadDashboard = hasPermission('dashboard:read')
  const canReadUsers = hasPermission('user:read')

  // OPTIMIZACIÓN: Usar SOLO useCompleteDashboardStats que trae TODAS las métricas en una sola llamada
  // Esto elimina 3 llamadas HTTP redundantes (dashboard, health, production)
  const { stats: completeStats, loading: completeLoading, error: completeError, refetch: refetchComplete, lastUpdated } = useCompleteDashboardStats(true);
  const kpiResumen = completeStats?.kpi_resumen;
  const rawKpiCards: KpiCardSummary[] = useMemo(
    () => kpiResumen?.cards ?? [],
    [kpiResumen]
  );
  const kpiCards = useMemo<KpiCardSummary[]>(() => {
    if (!rawKpiCards.length) return [];
    const indexOfId = (id: string) => KPI_ORDER.indexOf(id);
    return [...rawKpiCards].sort((a, b) => {
      const ai = indexOfId(a.id);
      const bi = indexOfId(b.id);
      if (ai === -1 && bi === -1) return a.id.localeCompare(b.id);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [rawKpiCards]);
  const healthTrendData = useMemo(() => {
    const trend = completeStats?.health_trend;
    if (!Array.isArray(trend)) return [];
    return trend
      .map((point, index) => ({
        name: String(point?.name || `Sem ${index + 1}`),
        value: Number(point?.value ?? 0),
      }))
      .filter((point) => Number.isFinite(point.value));
  }, [completeStats?.health_trend]);
  const healthTrendChange = useMemo(() => {
    if (healthTrendData.length < 2) return null;
    const first = healthTrendData[0]?.value ?? 0;
    const last = healthTrendData[healthTrendData.length - 1]?.value ?? 0;
    return Math.round((last - first) * 10) / 10;
  }, [healthTrendData]);
  const dashboardTotals = useMemo(
    () => ({
      animalesActivos: getStatValue(completeStats?.animales_activos),
      alertas: getStatValue(completeStats?.alertas_sistema),
      tareas: getStatValue(completeStats?.tareas_pendientes),
      tratamientos: getStatValue(completeStats?.tratamientos_activos),
      potreros: getStatValue(completeStats?.campos_registrados),
      usuarios: getStatValue(completeStats?.usuarios_activos),
    }),
    [completeStats]
  );
  const quickActions = useMemo(
    () => [
      {
        label: 'Animales',
        description: 'Inventario y fichas',
        icon: Building2,
        path: '/admin/animals',
        tone: 'bg-success/10 text-success border-success/20',
      },
      {
        label: 'Sanidad',
        description: 'Tratamientos activos',
        icon: HeartPulse,
        path: '/admin/treatments',
        tone: 'bg-danger/10 text-danger border-danger/20',
      },
      {
        label: 'Potreros',
        description: 'Ocupación y mapa',
        icon: MapPinned,
        path: '/admin/fields',
        tone: 'bg-info/10 text-info border-info/20',
      },
      {
        label: 'Reportes',
        description: 'ICA y gerenciales',
        icon: FileText,
        path: '/admin/reports',
        tone: 'bg-warning/15 text-warning-700 dark:text-warning-300 border-warning/25',
      },
      {
        label: 'Tareas',
        description: 'Pendientes del día',
        icon: CalendarDays,
        path: '/admin/tasks',
        tone: 'bg-primary/10 text-primary border-primary/20',
      },
      {
        label: 'Analítica',
        description: 'KPIs ejecutivos',
        icon: BarChart3,
        path: '/admin/analytics/executive',
        tone: 'bg-secondary border-border text-foreground',
      },
    ],
    []
  );

  // Obtener usuarios del sistema
  const fetchUsers = useCallback(async () => {
    if (!canReadUsers) return
    if (isFetchingUsersRef.current) return
    isFetchingUsersRef.current = true
    setLoading(true)
    try {
      // Optimización: traer solo usuarios recientes y datos mínimos para el panel
      const res = await apiFetch({
        url: '/users',
        method: 'GET',
        params: {
          limit: 20,
          sort: 'createdAt',
          dir: 'desc',
        }
      } as any)
      const data: User[] = unwrapApi<User[]>(res)
      setUsers(data)
      // Nota: los conteos globales de usuarios provienen de useDashboardCounts.
      // Aquí solo mantenemos la lista reciente para la sección "Usuarios recientes".
    } catch (error) {
      console.error('Error fetching users:', error)
      showToast(t('dashboard.errors.fetchUsers'), 'error')
      // Reintento único con backoff si el backend responde 429 (rate limit)
      if (axios.isAxiosError(error) && error.response?.status === 429 && !hasRetriedUsersRef.current) {
        const headers = error.response?.headers ?? {}
        const retryAfterHeader = (headers['retry-after'] as string | undefined) ?? (headers['Retry-After'] as string | undefined)
        const rateLimitReset = (headers['ratelimit-reset'] as string | undefined) ?? (headers['RateLimit-Reset'] as string | undefined)
        let delayMs = 30000 // fallback 30s
        const parseNum = (val?: string) => {
          if (!val) return undefined
          const n = parseInt(Array.isArray(val) ? (val as any)[0] : (val as any), 10)
          return Number.isNaN(n) ? undefined : n
        }
        const retryAfterSec = parseNum(retryAfterHeader)
        if (retryAfterSec !== undefined) {
          delayMs = Math.max(retryAfterSec * 1000, 5000)
        } else {
          const resetSec = parseNum(rateLimitReset)
          if (resetSec !== undefined) {
            const nowSec = Math.floor(Date.now() / 1000)
            delayMs = Math.max((resetSec - nowSec) * 1000, 5000)
          }
        }
        hasRetriedUsersRef.current = true
        showToast(`Límite alcanzado (429). Reintentando en ${Math.round(delayMs / 1000)}s…`, 'warning')
        usersRetryTimeoutRef.current = window.setTimeout(() => {
          fetchUsers()
        }, delayMs)
      }
    } finally {
      setLoading(false)
      isFetchingUsersRef.current = false
    }
  }, [canReadUsers, t, showToast])

  // Cargar datos iniciales (optimizado: llamadas paralelas con prioridad)
  useEffect(() => {
    if (!initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true
      // OPTIMIZACIÓN: Ejecutar llamadas en paralelo para reducir tiempo total
      // Los hooks de React Query (useCompleteDashboardStats, useDashboardCounts) ya se ejecutan automáticamente
      // Solo llamar manualmente a los que no usan React Query
      if (canReadUsers) {
        fetchUsers()
      }
      // Alertas ahora se manejan via AlertsPanel (React Query)
    }
  }, [user, canReadDashboard, fetchUsers])

  // OPTIMIZACIÓN: si completeStats ya están listos, no mantener el skeleton por alertas
  useEffect(() => {
    if (!completeLoading) {
      setIsInitialLoad(false)
    }
  }, [completeLoading])

  // Cleanup de timeouts programados
  useEffect(() => {
    return () => {
      if (usersRetryTimeoutRef.current) {
        clearTimeout(usersRetryTimeoutRef.current)
        usersRetryTimeoutRef.current = null
      }
    }
  }, [])

  // ELIMINADO: Ya no necesitamos actualizar systemStats desde stats (usamos completeStats directamente)

  // Alertas ahora se manejan via AlertsPanel (React Query) - código eliminado

  const kpiIconMap: Record<string, React.ReactNode> = useMemo(
    () => ({
      health_index: <HeartPulse className="w-5 h-5 text-destructive" />,
      vaccination_coverage: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      control_compliance: <Stethoscope className="w-5 h-5 text-sky-600" />,
      mortality_rate_30d: <Skull className="w-5 h-5 text-zinc-600" />,
      sales_rate_30d: <ShoppingCart className="w-5 h-5 text-warning" />,
      treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
      controls_frequency: <ClipboardCheck className="w-5 h-5 text-info" />,
      herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
      alert_pressure: <AlertTriangle className="w-5 h-5 text-destructive" />,
      task_load_index: <ListChecks className="w-5 h-5 text-orange-600" />,
    }),
    []
  );

  const renderDashboardHero = () => (
    <section className="relative overflow-hidden rounded-xl border border-border bg-card px-4 py-5 shadow-sm sm:px-6 lg:px-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-info to-warning" />
      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.7fr)] 2xl:items-center">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 rounded-lg px-2.5 py-1 text-xs">
              <Gauge className="h-3.5 w-3.5" />
              Centro operativo
            </Badge>
            <Badge variant="outline" className="gap-1.5 rounded-lg border-primary/20 bg-primary/5 px-2.5 py-1 text-xs text-primary">
              <Activity className="h-3.5 w-3.5" />
              Actualizado {formatLastUpdated(lastUpdated)}
            </Badge>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-normal text-foreground sm:text-3xl">
              Dashboard Villa Luz
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Vista rápida para priorizar sanidad, tareas, potreros y decisiones administrativas sin entrar a cada módulo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-6">
            <DashboardMetricPill label="Animales activos" value={dashboardTotals.animalesActivos} tone="success" />
            <DashboardMetricPill label="Alertas" value={dashboardTotals.alertas} tone={dashboardTotals.alertas > 0 ? 'danger' : 'default'} />
            <DashboardMetricPill label="Tareas" value={dashboardTotals.tareas} tone={dashboardTotals.tareas > 0 ? 'warning' : 'default'} />
            <DashboardMetricPill label="Tratamientos" value={dashboardTotals.tratamientos} tone="info" />
            <DashboardMetricPill label="Potreros" value={dashboardTotals.potreros} />
            <DashboardMetricPill label="Usuarios activos" value={dashboardTotals.usuarios} />
          </div>
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Accesos rápidos</h2>
              <p className="text-xs text-muted-foreground">Operaciones frecuentes</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchComplete()}
              className="h-9 gap-2 rounded-lg"
              title="Actualizar métricas"
            >
              <RefreshCcw className="h-4 w-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 2xl:grid-cols-1">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.path}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className="group flex min-h-[72px] items-center gap-3 rounded-lg border border-border bg-card p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg border', action.tone)}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block whitespace-nowrap text-sm font-bold text-foreground">{action.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{action.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );

  // Generación de tarjetas del dashboard usando estadísticas completas del backend
  const renderCompleteStatsCards = () => (
    <div className="space-y-6">
      {/* Errores del endpoint completo */}
      {completeError && (
        <Alert className="flex flex-col sm:flex-row items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-destructive" />
          <AlertDescription className="flex-1 min-w-0">
            <span className="block sm:inline overflow-wrap-anywhere">
              Error cargando estadísticas: {completeError.message}
            </span>
            <Button
              variant="link"
              onClick={() => refetchComplete()}
              className="mt-1 sm:mt-0 sm:ml-2 h-auto p-0 text-sm"
            >
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Accordion
        type="multiple"
        defaultValue={kpiCards.length > 0 ? ['kpis', 'general', 'operation'] : ['general', 'operation']}
        className="grid w-full gap-4"
      >
        {kpiCards.length > 0 && (
          <AccordionItem value="kpis" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="flex items-center gap-2">
                <span>KPIs de salud y operación</span>
                {kpiResumen?.ventana_dias && (
                  <span className="text-xs text-muted-foreground">
                    Ventana móvil {kpiResumen.ventana_dias}d
                  </span>
                )}
                <Badge variant="secondary">{kpiCards.length}</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {kpiCards.map((card) => {
                  const isBadWhenHigher =
                    card.id === 'mortality_rate_30d' ||
                    card.id === 'sales_rate_30d' ||
                    card.id === 'alert_pressure' ||
                    card.id === 'task_load_index';
                  const goodWhenHigher = !isBadWhenHigher;
                  const iconNode =
                    kpiIconMap[card.id] ?? (card.icono ? <span>{card.icono}</span> : null);
                  const unit = card.unidad || undefined;
                  const value =
                    typeof card.valor === 'number' && unit === '%'
                      ? card.valor.toFixed(1)
                      : card.valor;

                  return (
                    <KPICard
                      key={card.id}
                      title={card.titulo}
                      value={value}
                      unit={unit}
                      change={card.cambio}
                      icon={iconNode}
                      subtitle={card.descripcion}
                      goodWhenHigher={goodWhenHigher}
                    />
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        <AccordionItem value="general" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2">
              <span>Resumen general</span>
              <Badge variant="secondary">8</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DashboardStatsGrid>
              <DashboardStatsCard title="Usuarios Registrados" icon={Users} stat={completeStats?.usuarios_registrados} description="Total de usuarios" onClick={() => navigate('/admin/users')} />
              <DashboardStatsCard title="Usuarios Activos" icon={Users} stat={completeStats?.usuarios_activos} description="Actividad reciente (30 días)" onClick={() => navigate('/admin/users?filter=active')} />
              <DashboardStatsCard title="Animales Registrados" icon={Building2} stat={completeStats?.animales_registrados} description="Total de animales" onClick={() => navigate('/admin/animals')} />
              <DashboardStatsCard title="Animales Activos" icon={Building2} stat={completeStats?.animales_activos} description="En seguimiento" onClick={() => navigate('/admin/animals')} />
              <DashboardStatsCard title="Tratamientos Activos" icon={ClipboardList} stat={completeStats?.tratamientos_activos} description="En proceso" onClick={() => navigate('/admin/treatments')} />
              <DashboardStatsCard title="Tratamientos Totales" icon={ClipboardList} stat={completeStats?.tratamientos_totales} description="Histórico" onClick={() => navigate('/admin/treatments')} />
              <DashboardStatsCard title="Vacunas Aplicadas" icon={ClipboardList} stat={completeStats?.vacunas_aplicadas} description="Total histórico" onClick={() => navigate('/admin/vaccinations')} />
              <DashboardStatsCard title="Controles Realizados" icon={ClipboardList} stat={completeStats?.controles_realizados} description="Sanidad" onClick={() => navigate('/admin/control')} />
            </DashboardStatsGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="operation" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2">
              <span>Operación</span>
              <Badge variant="secondary">4</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DashboardStatsGrid>
              <DashboardStatsCard title="Potreros" icon={Building2} stat={completeStats?.campos_registrados} description="Campos registrados" onClick={() => navigate('/admin/fields')} />
              <DashboardStatsCard title="Tareas Pendientes" icon={AlertTriangle} stat={completeStats?.tareas_pendientes} description="Requieren atención" />
              <DashboardStatsCard title="Alertas del Sistema" icon={AlertTriangle} stat={completeStats?.alertas_sistema} description="Notificaciones" />
              <DashboardStatsCard title="Mejoras Genéticas" icon={ClipboardList} stat={completeStats?.mejoras_geneticas} description="Programas activos" onClick={() => navigate('/admin/genetic_improvements')} />
            </DashboardStatsGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="analytics" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2">
              <span>Analítica y Finanzas</span>
              <Badge variant="secondary">2</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DashboardStatsGrid columns={2}>
              <DashboardStatsCard title="Dashboard Financiero" icon={ClipboardList} stat={completeStats?.tratamientos_activos || 0} description="Gestión de transacciones y ROI" onClick={() => navigate('/admin/financial')} />
              <DashboardStatsCard title="Analítica Multi-Finca" icon={Building2} stat={completeStats?.campos_registrados || 0} description="Comparador de KPIs entre fincas" onClick={() => navigate('/admin/analytics/multi-finca')} />
            </DashboardStatsGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="catalogs" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2">
              <span>Catálogos</span>
              <Badge variant="secondary">6</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard title="Vacunas" icon={ClipboardList} stat={completeStats?.catalogo_vacunas} description="Catálogo" onClick={() => navigate('/admin/vaccines')} />
              <DashboardStatsCard title="Medicamentos" icon={ClipboardList} stat={completeStats?.catalogo_medicamentos} description="Catálogo" onClick={() => navigate('/admin/medications')} />
              <DashboardStatsCard title="Enfermedades" icon={ClipboardList} stat={completeStats?.catalogo_enfermedades} description="Catálogo" onClick={() => navigate('/admin/diseases')} />
              <DashboardStatsCard title="Especies" icon={ClipboardList} stat={completeStats?.catalogo_especies} description="Catálogo" onClick={() => navigate('/admin/species')} />
              <DashboardStatsCard title="Razas" icon={ClipboardList} stat={completeStats?.catalogo_razas} description="Catálogo" onClick={() => navigate('/admin/breeds')} />
              <DashboardStatsCard title="Tipos de Alimento" icon={ClipboardList} stat={completeStats?.catalogo_tipos_alimento} description="Catálogo" onClick={() => navigate('/admin/food-types')} />
            </DashboardStatsGrid>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="relations" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2">
              <span>Relaciones y tratamientos</span>
              <Badge variant="secondary">4</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-2">
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard title="Animales por Campo" icon={ClipboardList} stat={completeStats?.animales_por_campo} description="Distribución" onClick={() => navigate('/admin/animal-fields')} />
              <DashboardStatsCard title="Animales por Enfermedad" icon={ClipboardList} stat={completeStats?.animales_por_enfermedad} description="Sanidad" onClick={() => navigate('/admin/disease-animals')} />
              <DashboardStatsCard title="Tratamientos con Medicamentos" icon={ClipboardList} stat={completeStats?.tratamientos_medicamentos} description="Aplicados" onClick={() => navigate('/admin/treatment_medications')} />
              <DashboardStatsCard title="Tratamientos con Vacunas" icon={ClipboardList} stat={completeStats?.tratamientos_vacunas} description="Aplicados" onClick={() => navigate('/admin/treatment_vaccines')} />
            </DashboardStatsGrid>
          </AccordionContent>
        </AccordionItem>

        {/* Alertas del sistema - usando AlertsPanel consolidado */}
        {hasPermission('system:read') && (
          <AccordionItem value="alerts" className="overflow-hidden rounded-xl border border-border bg-card px-4 shadow-sm">
            <AccordionTrigger className="text-left hover:no-underline">
              <div className="flex items-center gap-2">
                <span>{t('dashboard.alerts.title')}</span>
                <Badge variant="secondary">Vía React Query</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <AlertsPanel />
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </div>
  );

  // Renderizar contenido de la pestaña de resumen
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {renderDashboardHero()}

      {/* Tarjetas de estadísticas con skeleton screen mejorado */}
      {(completeLoading || isInitialLoad) ? (
        <DashboardStatsGrid>
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </DashboardStatsGrid>
      ) : (
        <div className="space-y-6">
          <Suspense fallback={Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}>
            {renderCompleteStatsCards()}
          </Suspense>

          {healthTrendData.length > 0 && (
            <Card className="border-none shadow-2xl shadow-primary/5 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-xl overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      Tendencia de Salud Global
                    </CardTitle>
                    <CardDescription>Evolución del índice de salud en los últimos 30 días</CardDescription>
                  </div>
                  {healthTrendChange !== null && (
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                      {healthTrendChange >= 0 ? '+' : ''}{healthTrendChange} pts
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0 sm:p-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={healthTrendData}>
                      <defs>
                        <linearGradient id="colorHealth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="var(--primary)"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorHealth)"
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mapa de Potreros e IoT */}
          <Suspense fallback={<SkeletonCard className="h-[500px]" />}>
            <FieldHealthMap />
          </Suspense>
        </div>
      )}



      {/* Asistente IA */}
      <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
        <AIInsightsWidget />
      </Suspense>

      {/* Reportes Regulatorios */}
      <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
        <RegulatoryReportsWidget />
      </Suspense>

      {/* Alertas de Celo */}
      <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
        <HeatAlertsWidget />
      </Suspense>

      {/* Usuarios recientes */}
      {hasPermission('user:read') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">{t('dashboard.recentUsers.title')}</h2>
              <p className="text-sm text-muted-foreground">{t('dashboard.recentUsers.description')}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/users')}
              className="hidden sm:flex items-center gap-2"
            >
              {t('dashboard.recentUsers.viewAll')} <ExternalLink className="h-4 w-4" />
            </Button>
          </div>

          <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-muted/50/50">
                  <div className="mx-auto h-12 w-12 text-muted-foreground mb-3">
                    <Users className="h-12 w-12 opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground">{t('dashboard.recentUsers.noUsers')}</h3>
                  <p className="text-sm text-muted-foreground mt-1">No hay usuarios registrados recientemente.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.slice(0, 8).map((user) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        onView={() => navigate(`/admin/users?id=${user.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full sm:hidden mt-4"
                onClick={() => navigate('/admin/users')}
              >
                {t('dashboard.recentUsers.viewAll')}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )


  return (

    <div className="mx-auto max-w-[1600px] space-y-6 p-3 sm:p-4 lg:p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs con scroll horizontal en móvil — sin flex-wrap para no romper en 2+ líneas */}
        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-sm [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          <TabsTrigger value="overview" className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
            {t('dashboard.tabs.overview', 'Resumen')}
          </TabsTrigger>
          <TabsTrigger value="system" className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Database className="h-4 w-4" />
            {t('dashboard.tabs.system', 'Sistema')}
          </TabsTrigger>
          <TabsTrigger value="settings" className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Settings className="h-4 w-4" />
            {t('dashboard.tabs.settings', 'Ajustes')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-5">
          {renderOverviewTab()}
        </TabsContent>
        <TabsContent value="system" className="mt-5">
          <Suspense fallback={<div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}>
            <SystemTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings" className="mt-5">
          <Suspense fallback={<div className="grid grid-cols-1 gap-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>}>
            <SettingsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
