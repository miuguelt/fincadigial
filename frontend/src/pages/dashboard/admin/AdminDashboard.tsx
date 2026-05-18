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
  RefreshCw,
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Skull,
  ShoppingCart,
  Pill,
  ClipboardCheck,
  TrendingUp,
  ListChecks,
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
import { useCompleteDashboardStats, KpiCardSummary } from '@/features/dashboard/model/useCompleteDashboardStats';
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
      "group relative flex items-start gap-4 p-4 rounded-2xl border transition-all duration-300",
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
          {new Date(alert.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
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

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalAnimals: number;
  activeTreatments: number;
  pendingTasks: number;
  systemAlerts: number;
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
  const [, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalAnimals: 0,
    activeTreatments: 0,
    pendingTasks: 0,
    systemAlerts: 0,
  });
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
  const canReadSystem = hasPermission('system:read')

  // OPTIMIZACIÓN: Usar SOLO useCompleteDashboardStats que trae TODAS las métricas en una sola llamada
  // Esto elimina 3 llamadas HTTP redundantes (dashboard, health, production)
  const { stats: completeStats, loading: completeLoading, error: completeError, refetch: refetchComplete, lastUpdated: _lastUpdated } = useCompleteDashboardStats(true);
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

  // Helper: mapear color devuelto por backend a clases Tailwind
  const colorToClasses = (color?: string) => {
    switch (color) {
      case 'red':
        return 'border-red-200 bg-red-50';
      case 'orange':
      case 'yellow':
        return 'border-yellow-200 bg-yellow-50';
      case 'green':
        return 'border-green-200 bg-green-50';
      case 'blue':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  // Helper: icono según backend o fallback por tipo
  const renderAlertIcon = (alert: SystemAlert) => {
    if (alert.icon) {
      return <span className="text-xl mt-0.5">{alert.icon}</span>;
    }
    if (alert.type === 'vaccination') return <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />;
    if (alert.type === 'health') return <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />;
    if (alert.type === 'growth' || alert.type === 'productivity') return <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />;
    return <div className="h-5 w-5 rounded-full bg-blue-500 mt-0.5" />;
  };
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
      health_index: <HeartPulse className="w-5 h-5 text-red-500" />,
      vaccination_coverage: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
      control_compliance: <Stethoscope className="w-5 h-5 text-sky-600" />,
      mortality_rate_30d: <Skull className="w-5 h-5 text-zinc-600" />,
      sales_rate_30d: <ShoppingCart className="w-5 h-5 text-amber-600" />,
      treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
      controls_frequency: <ClipboardCheck className="w-5 h-5 text-blue-600" />,
      herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
      alert_pressure: <AlertTriangle className="w-5 h-5 text-red-500" />,
      task_load_index: <ListChecks className="w-5 h-5 text-orange-600" />,
    }),
    []
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
        defaultValue={kpiCards.length > 0 ? ['kpis', 'general', 'alerts'] : ['general', 'alerts']}
        className="w-full"
      >
        {kpiCards.length > 0 && (
          <AccordionItem value="kpis">
            <AccordionTrigger className="text-left">
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

        <AccordionItem value="general">
          <AccordionTrigger className="text-left">
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

        <AccordionItem value="operation">
          <AccordionTrigger className="text-left">
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

        <AccordionItem value="analytics">
          <AccordionTrigger className="text-left">
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

        <AccordionItem value="catalogs">
          <AccordionTrigger className="text-left">
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

        <AccordionItem value="relations">
          <AccordionTrigger className="text-left">
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
          <AccordionItem value="alerts">
            <AccordionTrigger className="text-left">
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

          {/* Gráfica de Tendencia Global Premium */}
          <Card className="border-none shadow-2xl shadow-primary/5 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl rounded-[2rem] overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Tendencia de Salud Global
                  </CardTitle>
                  <CardDescription>Evolución del índice de salud en los últimos 30 días</CardDescription>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                  +12.5% este mes
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Sem 1', value: 65 },
                    { name: 'Sem 2', value: 72 },
                    { name: 'Sem 3', value: 68 },
                    { name: 'Sem 4', value: 85 },
                  ]}>
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
                <div className="text-center py-12 border-2 border-dashed rounded-lg bg-gray-50/50">
                  <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                    <Users className="h-12 w-12 opacity-50" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900">{t('dashboard.recentUsers.noUsers')}</h3>
                  <p className="text-sm text-gray-500 mt-1">No hay usuarios registrados recientemente.</p>
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

    <div className="space-y-6 p-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {/* Tabs con scroll horizontal en móvil — sin flex-wrap para no romper en 2+ líneas */}
        <TabsList className="overflow-x-auto flex-nowrap w-full [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          <TabsTrigger value="overview">{t('dashboard.tabs.overview', 'Resumen')}</TabsTrigger>
          <TabsTrigger value="system">{t('dashboard.tabs.system', 'Sistema')}</TabsTrigger>
          <TabsTrigger value="settings">{t('dashboard.tabs.settings', 'Ajustes')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>
        <TabsContent value="system">
          <Suspense fallback={<div className="grid grid-cols-1 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>}>
            <SystemTab />
          </Suspense>
        </TabsContent>
        <TabsContent value="settings">
          <Suspense fallback={<div className="grid grid-cols-1 gap-4">{Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}</div>}>
            <SettingsTab />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
