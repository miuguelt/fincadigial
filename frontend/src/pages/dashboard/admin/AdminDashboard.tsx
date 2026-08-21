import React, { Suspense, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  Database,
  HeartPulse,
  ListChecks,
  MapPinned,
  RefreshCcw,
  Settings,
  Sparkles,
  Stethoscope,
  Sunrise,
} from 'lucide-react';

import { useAuth } from '@/features/auth/model/useAuth';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { SkeletonCard } from '@/shared/ui/skeleton';
import { useT } from '@/shared/i18n';
import {
  useCompleteDashboardStats,
  type DashboardStat,
  type KpiCardSummary,
} from '@/features/dashboard/model/useCompleteDashboardStats';
import { FincaHeroBanner } from '@/widgets/finca/hero';
import DailyFarmGuide from '@/widgets/dashboard/DailyFarmGuide';
import UpcomingEventsPanel from '@/widgets/dashboard/UpcomingEventsPanel';

import PulseTile, { type PulseTone } from './overview/PulseTile';
import SectionHeading from './overview/SectionHeading';
import HerdHealthSection from './overview/HerdHealthSection';
import AdminLinksRow from './overview/AdminLinksRow';

// Code splitting: nada de esto es necesario para el primer pintado.
const HeatAlertsWidget = React.lazy(() => import('@/widgets/reproduction/HeatAlertsWidget'));
const RegulatoryReportsWidget = React.lazy(() => import('@/widgets/dashboard/RegulatoryReportsWidget'));
const AIInsightsWidget = React.lazy(() =>
  import('@/widgets/dashboard/AIInsightsWidget').then((m) => ({ default: m.AIInsightsWidget })),
);
const SystemTab = React.lazy(() => import('@/widgets/dashboard/SystemTab'));
const SettingsTab = React.lazy(() => import('@/widgets/dashboard/SettingsTab'));

/** Roles con acceso a configuración técnica del sistema. */
const SYSTEM_ROLES = ['Administrador', 'Propietario'];

const getStatValue = (stat?: DashboardStat | number | null) => {
  if (typeof stat === 'number') return stat;
  return stat?.valor ?? 0;
};

const getStatChange = (stat?: DashboardStat | number | null) => {
  if (typeof stat === 'number' || !stat) return null;
  return typeof stat.cambio_porcentual === 'number' ? stat.cambio_porcentual : null;
};

const formatLastUpdated = (date: Date | null) => {
  if (!date) return 'sin actualizar';
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

const healthTone = (value: number | null): PulseTone => {
  if (value === null) return 'neutral';
  if (value >= 80) return 'success';
  if (value >= 60) return 'warning';
  return 'danger';
};

const AdminDashboard: React.FC = () => {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  const {
    stats,
    loading,
    error,
    refetch,
    lastUpdated,
  } = useCompleteDashboardStats(true);

  const canSeeSystem = SYSTEM_ROLES.includes(String(user?.role ?? ''));

  const kpiCards: KpiCardSummary[] = useMemo(() => stats?.kpi_resumen?.cards ?? [], [stats]);

  const healthIndex = useMemo(() => {
    const card = kpiCards.find((c) => c.id === 'health_index');
    return typeof card?.valor === 'number' ? Math.round(card.valor) : null;
  }, [kpiCards]);

  const healthTrend = useMemo(() => {
    const trend = stats?.health_trend;
    if (!Array.isArray(trend)) return [];
    return trend
      .map((point, index) => ({
        name: String(point?.name || `Sem ${index + 1}`),
        value: Number(point?.value ?? 0),
      }))
      .filter((point) => Number.isFinite(point.value));
  }, [stats?.health_trend]);

  const totals = useMemo(
    () => ({
      animales: getStatValue(stats?.animales_activos),
      animalesCambio: getStatChange(stats?.animales_activos),
      alertas: getStatValue(stats?.alertas_sistema),
      tareas: getStatValue(stats?.tareas_pendientes),
      tratamientos: getStatValue(stats?.tratamientos_activos),
      potreros: getStatValue(stats?.campos_registrados),
    }),
    [stats],
  );

  const isFirstLoad = loading && !stats;

  const renderPulse = () => (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">Estado de la finca</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lo esencial de hoy: cuántos animales hay, qué está pendiente y qué necesita atención.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5 rounded-lg px-2.5 py-1 text-xs">
            <Activity className="h-3.5 w-3.5" />
            Actualizado {formatLastUpdated(lastUpdated)}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={loading}
            className="h-9 gap-2 rounded-lg"
            title="Actualizar métricas"
          >
            <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>
        </div>
      </div>

      {isFirstLoad ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} className="h-[112px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
          <PulseTile
            label="Animales activos"
            value={totals.animales}
            hint="En seguimiento"
            icon={Building2}
            tone="success"
            delta={totals.animalesCambio}
            onClick={() => navigate('/admin/animals')}
          />
          <PulseTile
            label="Alertas"
            value={totals.alertas}
            hint={totals.alertas > 0 ? 'Requieren revisión' : 'Todo en orden'}
            icon={AlertTriangle}
            tone={totals.alertas > 0 ? 'danger' : 'success'}
            onClick={() => navigate('/admin/alerts')}
          />
          <PulseTile
            label="Tareas pendientes"
            value={totals.tareas}
            hint={totals.tareas > 0 ? 'Por asignar o cerrar' : 'Sin pendientes'}
            icon={ListChecks}
            tone={totals.tareas > 0 ? 'warning' : 'success'}
            onClick={() => navigate('/admin/tasks')}
          />
          <PulseTile
            label="Tratamientos"
            value={totals.tratamientos}
            hint="En curso"
            icon={Stethoscope}
            tone="info"
            onClick={() => navigate('/admin/treatments')}
          />
          <PulseTile
            label="Potreros"
            value={totals.potreros}
            hint="Potreros registrados"
            icon={MapPinned}
            onClick={() => navigate('/admin/fields')}
          />
          <PulseTile
            label="Salud de la finca"
            value={healthIndex ?? '—'}
            unit={healthIndex !== null ? '%' : undefined}
            hint="Índice general"
            icon={HeartPulse}
            tone={healthTone(healthIndex)}
            onClick={() => navigate('/admin/analytics/executive')}
          />
        </div>
      )}
    </section>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Identidad de la finca y clima: lo primero que define la jornada. */}
      <FincaHeroBanner />

      {renderPulse()}

      {error && (
        <Alert className="flex flex-col items-start gap-2 sm:flex-row">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
          <AlertDescription className="min-w-0 flex-1">
            <span className="block sm:inline">No se pudieron cargar las métricas: {error.message}</span>
            <Button variant="link" onClick={() => refetch()} className="mt-1 h-auto p-0 text-sm sm:ml-2 sm:mt-0">
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Lo accionable del día: qué atender ya y qué viene. */}
      <section className="vl-deferred-section">
        <SectionHeading
          icon={Sunrise}
          title="Hoy en la finca"
          subtitle="Qué atender primero y qué eventos vienen esta semana"
          actionLabel="Ver calendario"
          onAction={() => navigate('/admin/calendar')}
        />
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DailyFarmGuide />
          <UpcomingEventsPanel />
        </div>
      </section>

      <HerdHealthSection
        cards={kpiCards}
        ventanaDias={stats?.kpi_resumen?.ventana_dias}
        trend={healthTrend}
        onOpenAnalytics={() => navigate('/admin/analytics/executive')}
      />


      {/* Reproducción: celos y servicios, el motor productivo del ganado. */}
      <section className="vl-deferred-section">
        <SectionHeading
          icon={CalendarDays}
          title="Reproducción"
          subtitle="Celos detectados y hembras listas para servicio"
          actionLabel="Ver reproducción"
          onAction={() => navigate('/admin/reproduction')}
        />
        <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
          <HeatAlertsWidget />
        </Suspense>
      </section>

      {/* Cumplimiento ICA: obligatorio para vender y movilizar. */}
      <section className="vl-deferred-section">
        <SectionHeading
          icon={Building2}
          title="Cumplimiento ICA"
          subtitle="Reportes sanitarios obligatorios y su vencimiento"
          actionLabel="Ver reportes"
          onAction={() => navigate('/admin/regulatory-reports')}
        />
        <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
          <RegulatoryReportsWidget />
        </Suspense>
      </section>

      {/* Recomendaciones automáticas: útiles, pero no compiten con lo urgente. */}
      <section>
        <SectionHeading
          icon={Sparkles}
          title="Recomendaciones"
          subtitle="Sugerencias a partir de los datos registrados en la finca"
        />
        <Suspense fallback={<SkeletonCard className="h-[200px]" />}>
          <AIInsightsWidget />
        </Suspense>
      </section>

      {canSeeSystem && <AdminLinksRow />}
    </div>
  );

  return (
    <div className="mx-auto max-w-[1600px] min-h-full space-y-6 p-2 sm:p-4 lg:p-5 w-full overflow-x-hidden">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-auto w-full justify-start gap-2 overflow-x-auto rounded-xl border border-border bg-card p-1.5 shadow-sm [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          <TabsTrigger
            value="overview"
            className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <BarChart3 className="h-4 w-4" />
            {t('dashboard.tabs.overview', 'Resumen')}
          </TabsTrigger>
          {canSeeSystem && (
            <>
              <TabsTrigger
                value="system"
                className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Database className="h-4 w-4" />
                {t('dashboard.tabs.system', 'Sistema')}
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="h-10 gap-2 rounded-lg px-4 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Settings className="h-4 w-4" />
                {t('dashboard.tabs.settings', 'Ajustes')}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <div
          role="tabpanel"
          aria-hidden={activeTab !== 'overview'}
          hidden={activeTab !== 'overview'}
          className="mt-5"
        >
          {renderOverview()}
        </div>

        {canSeeSystem && (
          <>
            <TabsContent value="system" className="mt-5">
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                }
              >
                <SystemTab />
              </Suspense>
            </TabsContent>
            <TabsContent value="settings" className="mt-5">
              <Suspense
                fallback={
                  <div className="grid grid-cols-1 gap-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <SkeletonCard key={i} />
                    ))}
                  </div>
                }
              >
                <SettingsTab />
              </Suspense>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
