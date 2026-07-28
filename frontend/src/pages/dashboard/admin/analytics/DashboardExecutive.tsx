import React, { useMemo } from 'react';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import KPICard from '@/widgets/analytics/KPICard';
import { KpiCardSummary } from '@/features/dashboard/model/useCompleteDashboardStats';
import {
  HeartPulse,
  ShieldCheck,
  Stethoscope,
  Skull,
  ShoppingCart,
  Pill,
  ClipboardCheck,
  TrendingUp,
  AlertTriangle,
  ListChecks,
} from 'lucide-react';
import { motion } from 'framer-motion';

// Componentes modulares
import { ExecutiveHeader } from './components/ExecutiveHeader';
import { ExecutiveDemographics } from './components/ExecutiveDemographics';
import { ExecutiveHealth } from './components/ExecutiveHealth';
import { ExecutiveProduction } from './components/ExecutiveProduction';
import { WaterAnalyticsWidget } from './components/WaterAnalyticsWidget';

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

const DashboardExecutive: React.FC = () => {
  const {
    useDashboard,
    useAnimalStatistics,
    useHealthStatistics,
    useProductionStatistics,
  } = useAnalytics();

  const { data: dashboard, isLoading: loadingDashboard } = useDashboard();
  const { data: animalStats, isLoading: loadingAnimalStats } = useAnimalStatistics();
  const { data: healthStats } = useHealthStatistics();
  const { data: productionStats } = useProductionStatistics();

  const kpiResumen = dashboard?.kpi_resumen;
  const rawKpiCards: KpiCardSummary[] = useMemo(() => kpiResumen?.cards ?? [], [kpiResumen]);
  
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

  if (loadingDashboard) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <p className="text-muted-foreground text-lg">No hay datos disponibles</p>
      </div>
    );
  }

  // Preparar datos para demografía
  const totalesSexo = {
    machos: dashboard.distribucion_sexo?.machos || (animalStats as any)?.by_sex?.Macho || 0,
    hembras: dashboard.distribucion_sexo?.hembras || (animalStats as any)?.by_sex?.Hembra || 0,
  };
  
  const statusChartData = animalStats?.by_status && Object.keys(animalStats.by_status).length > 0
    ? { labels: Object.keys(animalStats.by_status), datasets: [{ data: Object.values(animalStats.by_status) }] }
    : null;
    
  const ageDistributionData = animalStats?.age_distribution && animalStats.age_distribution.length > 0
    ? { labels: animalStats.age_distribution.map((item: any) => item.age_range), datasets: [{ data: animalStats.age_distribution.map((item: any) => item.count) }] }
    : null;

  const topBreeds = animalStats?.by_breed?.length ? animalStats.by_breed : dashboard.distribucion_razas_top5 || [];

  // Preparar datos para salud
  const healthTimeSeries = (() => {
    const treatments = healthStats?.treatments_by_month || [];
    const vaccinations = healthStats?.vaccinations_by_month || [];
    if (!treatments.length && !vaccinations.length) return null;
    
    const labels = Array.from(new Set([...treatments.map((i: any) => i.period), ...vaccinations.map((i: any) => i.period)])).sort();
    const mapSeries = (src: any[]) => labels.map((p) => src.find((i) => i.period === p)?.count ?? 0);

    return {
      labels,
      datasets: [
        { label: 'Tratamientos', data: mapSeries(treatments) },
        { label: 'Vacunaciones', data: mapSeries(vaccinations) },
      ],
    };
  })();

  const fechaActualizacion = dashboard.generated_at ? new Date(dashboard.generated_at) : undefined;
  const totalAnimales = animalStats?.total ?? dashboard.animales_activos?.valor ?? 0;
  const treatmentSuccessRate = healthStats?.treatment_success_rate ?? 0;
  const enfermedadesComunes = healthStats?.common_diseases || [];

  return (
    <div className="min-h-full bg-background/50 p-4 sm:p-6 lg:p-8 space-y-8 overflow-x-hidden">
      <ExecutiveHeader fechaActualizacion={fechaActualizacion} />

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {kpiCards.length > 0 ? (
          kpiCards.slice(0, 4).map((card, index) => {
            const isBadWhenHigher = ['mortality_rate_30d', 'sales_rate_30d', 'alert_pressure', 'task_load_index'].includes(card.id);
            const unit = card.unidad || undefined;
            const value = typeof card.valor === 'number' && unit === '%' ? card.valor.toFixed(1) : card.valor;
            const iconNode = kpiIconMap[card.id] || (card.icono ? <span>{card.icono}</span> : null);

            return (
              <motion.div 
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <KPICard
                  title={card.titulo}
                  value={value}
                  unit={unit}
                  change={card.cambio}
                  icon={iconNode}
                  subtitle={card.descripcion}
                  goodWhenHigher={!isBadWhenHigher}
                  loading={loadingDashboard}
                />
              </motion.div>
            );
          })
        ) : (
          <>
             <KPICard title="Animales registrados" value={dashboard.animales_registrados?.valor || 0} change={dashboard.animales_registrados?.cambio_porcentual} icon="🐄" loading={loadingDashboard} />
             <KPICard title="Animales vivos" value={dashboard.animales_activos?.valor || 0} change={dashboard.animales_activos?.cambio_porcentual} icon="💚" loading={loadingDashboard} />
             <KPICard title="Alertas activas" value={dashboard.alertas_sistema?.valor || 0} change={dashboard.alertas_sistema?.cambio_porcentual} icon="🔔" loading={loadingDashboard} />
          </>
        )}
      </div>

      <div className="flex flex-col gap-8">
        {/* Bento Grid: Demographics */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black text-foreground">Inventario y Demografía</h2>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>
          <ExecutiveDemographics
            totalesSexo={totalesSexo}
            statusChartData={statusChartData}
            ageDistributionData={ageDistributionData}
            topBreeds={topBreeds}
            totalAnimales={totalAnimales}
            loading={loadingAnimalStats}
          />
        </section>

        {/* Bento Grid: Health */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black text-foreground">Salud y Bienestar</h2>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>
          <ExecutiveHealth
            healthTimeSeries={healthTimeSeries}
            enfermedadesComunes={enfermedadesComunes}
            treatmentSuccessRate={treatmentSuccessRate}
          />
        </section>

        {/* Bento Grid: Production */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black text-foreground">Eficiencia de Producción</h2>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>
          <ExecutiveProduction
            productionStats={productionStats}
            dashboard={dashboard}
          />
        </section>

        {/* Calidad y nivel de las fuentes de agua */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-black text-foreground">Fuentes de Agua</h2>
            <div className="h-px flex-1 bg-border/50"></div>
          </div>
          <WaterAnalyticsWidget />
        </section>
      </div>
    </div>
  );
};

export default DashboardExecutive;
