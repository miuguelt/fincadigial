import React, { useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardStatsCard, DashboardStatsGrid } from '@/widgets/dashboard/DashboardStatsCard';
import { useCompleteDashboardStats, getStatValue, KpiCardSummary } from '@/features/dashboard/model/useCompleteDashboardStats';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { SkeletonCard } from '@/shared/ui/skeleton';
import {
  Heart,
  Activity,
  Syringe,
  FileCheck,
  Map,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Pill,
  Leaf,
  TestTube,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  Calendar
} from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';

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

const InstructorDashboard: React.FC = () => {
  const { stats, loading, error, refetch, lastUpdated } = useCompleteDashboardStats();
  const navigate = useNavigate();
  const kpiResumen = stats?.kpi_resumen;
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
  const kpiIconMap = useMemo<Record<string, React.ReactNode>>(
    () => ({
      health_index: <Heart className="w-5 h-5 text-destructive" />,
      vaccination_coverage: <Syringe className="w-5 h-5 text-emerald-600" />,
      control_compliance: <FileCheck className="w-5 h-5 text-sky-600" />,
      mortality_rate_30d: <AlertTriangle className="w-5 h-5 text-zinc-600" />,
      sales_rate_30d: <TrendingUp className="w-5 h-5 text-warning" />,
      treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
      controls_frequency: <Calendar className="w-5 h-5 text-info" />,
      herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
      alert_pressure: <AlertTriangle className="w-5 h-5 text-destructive" />,
      task_load_index: <FileCheck className="w-5 h-5 text-orange-600" />,
    }),
    []
  );

  if (error) {
    return (
      <div className="bg-background px-4 pt-4 pb-6 sm:pb-8">
        <div className="w-full max-w-7xl mx-auto">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error cargando estadísticas: {error.message}
              <Button variant="link" onClick={() => refetch()} className="ml-2">
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">
              Panel de Instructor
            </h1>
            <p className="text-sm text-muted-foreground">
              Resumen de actividades y estadísticas
            </p>
            {lastUpdated && (
              <p className="text-xs text-muted-foreground mt-1">
                Última actualización: {lastUpdated.toLocaleTimeString('es-CO')}
              </p>
            )}
        </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>

        {/* Navbar de Cursos y Capacitación */}
        <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <GraduationCap className="h-5 w-5 text-indigo-600" />
            <h2 className="text-sm font-semibold text-indigo-900">Centro de Capacitación</h2>
            <Button
              variant="link"
              size="sm"
              className="ml-auto text-xs text-indigo-600"
              onClick={() => navigate('/instructor/courses')}
            >
              Ver todos
            </Button>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-200">
            <button
              onClick={() => navigate('/instructor/courses/basics')}
              className="flex items-center gap-2 px-4 py-2 bg-card/80 hover:bg-card rounded-lg border border-indigo-200/50 hover:border-indigo-300 transition-all min-w-fit group"
            >
              <BookOpen className="h-4 w-4 text-indigo-500 group-hover:text-indigo-600" />
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Manejo Básico</p>
                <p className="text-[10px] text-muted-foreground">8 lecciones • 2h</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/instructor/courses/health')}
              className="flex items-center gap-2 px-4 py-2 bg-card/80 hover:bg-card rounded-lg border border-indigo-200/50 hover:border-indigo-300 transition-all min-w-fit group"
            >
              <Heart className="h-4 w-4 text-destructive group-hover:text-destructive" />
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Sanidad Animal</p>
                <p className="text-[10px] text-muted-foreground">12 lecciones • 4h</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/instructor/courses/reproduction')}
              className="flex items-center gap-2 px-4 py-2 bg-card/80 hover:bg-card rounded-lg border border-indigo-200/50 hover:border-indigo-300 transition-all min-w-fit group"
            >
              <Activity className="h-4 w-4 text-emerald-500 group-hover:text-emerald-600" />
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Reproducción</p>
                <p className="text-[10px] text-muted-foreground">6 lecciones • 2.5h</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/instructor/courses/records')}
              className="flex items-center gap-2 px-4 py-2 bg-card/80 hover:bg-card rounded-lg border border-indigo-200/50 hover:border-indigo-300 transition-all min-w-fit group"
            >
              <Award className="h-4 w-4 text-warning group-hover:text-warning" />
              <div className="text-left">
                <p className="text-xs font-medium text-foreground">Registro ICA</p>
                <p className="text-[10px] text-muted-foreground">10 lecciones • 3h</p>
              </div>
            </button>
          </div>
        </div>

        {/* KPIs clave de salud y operación */}
        {!loading && kpiCards.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3">KPIs del hato (últimos 30 días)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
              {kpiCards.map((card) => {
                // Para el instructor todos los KPIs son informativos; las tasas negativas (mortalidad)
                // se muestran como mejores cuando bajan.
                const isBadWhenHigher =
                  card.id === 'mortality_rate_30d' ||
                  card.id === 'sales_rate_30d' ||
                  card.id === 'alert_pressure' ||
                  card.id === 'task_load_index';
                const unit = card.unidad || undefined;
                const value =
                  typeof card.valor === 'number' && unit === '%'
                    ? card.valor.toFixed(1)
                    : card.valor;
                const iconNode =
                  kpiIconMap[card.id] ??
                  (card.icono ? <span className="text-lg">{card.icono}</span> : null);

                return (
                  <KPICard
                    key={card.id}
                    title={card.titulo}
                    value={value}
                    unit={unit}
                    change={card.cambio}
                    icon={iconNode}
                    subtitle={card.descripcion}
                    goodWhenHigher={!isBadWhenHigher}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Estadísticas Principales */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Resumen General</h2>
          {loading ? (
            <DashboardStatsGrid>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid>
              <DashboardStatsCard
                title="Animales Registrados"
                icon={Heart}
                stat={stats?.animales_registrados}
                description="Total de animales en el sistema"
                onClick={() => navigate('/instructor/animals')}
              />
              <DashboardStatsCard
                title="Animales Activos"
                icon={Heart}
                stat={stats?.animales_activos}
                description="Animales en seguimiento"
              />
              <DashboardStatsCard
                title="Tratamientos Activos"
                icon={Activity}
                stat={stats?.tratamientos_activos}
                description="En proceso actualmente"
                onClick={() => navigate('/instructor/treatments')}
              />
              <DashboardStatsCard
                title="Vacunas Aplicadas"
                icon={Syringe}
                stat={stats?.vacunas_aplicadas}
                description="Total histórico"
                onClick={() => navigate('/instructor/vaccinations')}
              />
              <DashboardStatsCard
                title="Controles Realizados"
                icon={FileCheck}
                stat={stats?.controles_realizados}
                description="Controles sanitarios"
                onClick={() => navigate('/instructor/controls')}
              />
              <DashboardStatsCard
                title="Tareas Pendientes"
                icon={AlertTriangle}
                stat={stats?.tareas_pendientes}
                description="Requieren atención"
              />
              <DashboardStatsCard
                title="Potreros"
                icon={Map}
                stat={stats?.campos_registrados}
                description="Terrenos disponibles"
                onClick={() => navigate('/instructor/fields')}
              />
              <DashboardStatsCard
                title="Mejoras Genéticas"
                icon={TrendingUp}
                stat={stats?.mejoras_geneticas}
                description="Programas activos"
                onClick={() => navigate('/instructor/genetic-improvements')}
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Sección de Sanidad */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Sanidad Animal</h2>
          {loading ? (
            <DashboardStatsGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard
                title="Animales Enfermos"
                icon={HeartPulse}
                stat={stats?.animales_por_enfermedad}
                description="Requieren tratamiento"
                onClick={() => navigate('/instructor/disease-animals')}
              />
              <DashboardStatsCard
                title="Catálogo Enfermedades"
                icon={AlertTriangle}
                stat={stats?.catalogo_enfermedades}
                description="Enfermedades registradas"
                onClick={() => navigate('/instructor/diseases')}
              />
              <DashboardStatsCard
                title="Catálogo Medicamentos"
                icon={Pill}
                stat={stats?.catalogo_medicamentos}
                description="Medicamentos disponibles"
                onClick={() => navigate('/instructor/medications')}
              />
              <DashboardStatsCard
                title="Catálogo Vacunas"
                icon={Syringe}
                stat={stats?.catalogo_vacunas}
                description="Vacunas registradas"
                onClick={() => navigate('/instructor/vaccines')}
              />
              <DashboardStatsCard
                title="Tratamientos Totales"
                icon={Activity}
                stat={stats?.tratamientos_totales}
                description="Histórico completo"
              />
              <DashboardStatsCard
                title="Tratamientos con Medicamentos"
                icon={Pill}
                stat={stats?.tratamientos_medicamentos}
                description="Medicamentos aplicados"
              />
              <DashboardStatsCard
                title="Tratamientos con Vacunas"
                icon={Syringe}
                stat={stats?.tratamientos_vacunas}
                description="Vacunas aplicadas"
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Sección de Gestión */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Gestión y Recursos</h2>
          {loading ? (
            <DashboardStatsGrid columns={3}>
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </DashboardStatsGrid>
          ) : (
            <DashboardStatsGrid columns={3}>
              <DashboardStatsCard
                title="Especies"
                icon={TestTube}
                stat={stats?.catalogo_especies}
                description="Especies registradas"
                onClick={() => navigate('/instructor/species-breeds')}
              />
              <DashboardStatsCard
                title="Razas"
                icon={TrendingUp}
                stat={stats?.catalogo_razas}
                description="Razas disponibles"
                onClick={() => navigate('/instructor/species-breeds')}
              />
              <DashboardStatsCard
                title="Tipos de Alimento"
                icon={Leaf}
                stat={stats?.catalogo_tipos_alimento}
                description="Alimentos disponibles"
                onClick={() => navigate('/instructor/food-types')}
              />
              <DashboardStatsCard
                title="Ubicación Animales"
                icon={Map}
                stat={stats?.animales_por_campo}
                description="Distribución en potreros"
                onClick={() => navigate('/instructor/fields')}
              />
              <DashboardStatsCard
                title="Usuarios Activos"
                icon={Users}
                stat={stats?.usuarios_activos}
                description="Personal activo"
              />
              <DashboardStatsCard
                title="Alertas del Sistema"
                icon={AlertTriangle}
                stat={stats?.alertas_sistema}
                description="Notificaciones pendientes"
              />
            </DashboardStatsGrid>
          )}
        </div>

        {/* Card de Información */}
        <Card>
          <CardHeader>
            <CardTitle>Información del Sistema</CardTitle>
            <CardDescription>
              Las estadísticas se actualizan automáticamente cada 2 minutos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge className={getStatusBadgeClass('success')}>
                <span className="w-2 h-2 bg-success-500 rounded-full mr-2"></span>
                Sistema Activo
              </Badge>
              <Badge variant="outline">
                Optimizado con caché de 2 minutos
              </Badge>
              <Badge variant="outline">
                {getStatValue(stats?.animales_registrados)} animales monitoreados
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const HeartPulse = forwardRef<SVGSVGElement, { className?: string }>(({ className }, _ref) => (
  <Heart className={className} />
));

export default InstructorDashboard;
