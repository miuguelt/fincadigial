import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Syringe } from 'lucide-react';

import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import KPICard from '@/widgets/analytics/KPICard';
import { Button } from '@/shared/ui/button';
import {
  buildVaccinationSeries,
  shouldRefreshVaccinationAnalytics,
  summarizeVaccinationSeries,
} from './vaccinationAnalytics';
import VaccinationAnalyticsModal from './VaccinationAnalyticsModal';

export const VaccinationInsights: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const { useHealthStatistics } = useAnalytics();
  const healthQuery = useHealthStatistics();
  const statsQuery = useQuery({
    queryKey: ['vaccinations-stats'],
    queryFn: () => vaccinationsService.getVaccinationsStats(),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{
        resource?: unknown;
        endpoint?: unknown;
        local?: unknown;
      }>).detail || {};

      if (!shouldRefreshVaccinationAnalytics(detail)) return;
      void queryClient.invalidateQueries({ queryKey: ['vaccinations-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['health-statistics'] });
    };

    window.addEventListener('server-resource-changed', handleRefresh);
    return () => window.removeEventListener('server-resource-changed', handleRefresh);
  }, [queryClient]);

  const healthStats = healthQuery.data;
  const series = useMemo(
    () => buildVaccinationSeries(healthStats?.vaccinations_by_month ?? [], 12),
    [healthStats?.vaccinations_by_month],
  );
  const summary = useMemo(
    () => summarizeVaccinationSeries(series, statsQuery.data),
    [series, statsQuery.data],
  );

  const chartLoading = healthQuery.isLoading;
  const chartError = healthQuery.isError;
  const statsLoading = statsQuery.isLoading;

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Barra de título de sección y botón de analíticas */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Syringe className="h-3.5 w-3.5" />
          </div>
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">
            Resumen Sanitario de Vacunación
          </span>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setShowModal(true)}
          className="h-7 px-2.5 text-xs font-semibold flex items-center gap-1.5 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 active:scale-[0.98] transition-all"
        >
          <BarChart3 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Ver Gráficos y Tendencias</span>
        </Button>
      </div>

      {/* Rejilla de 4 KPIs compactos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard
          compact
          title="Total Registradas"
          value={summary.total}
          icon="💉"
          subtitle="Histórico general"
          loading={statsLoading}
        />
        <KPICard
          compact
          title="Últimos 12 Meses"
          value={summary.periodTotal}
          icon="📅"
          subtitle="Dosis aplicadas"
          loading={chartLoading}
        />
        <KPICard
          compact
          title="Promedio Mensual"
          value={summary.averagePerMonth}
          icon="📈"
          subtitle={`${summary.activeMonths} meses activos`}
          loading={chartLoading}
        />
        <KPICard
          compact
          title="Registradas Hoy"
          value={summary.recentToday}
          icon="✓"
          subtitle="Nuevas dosis hoy"
          loading={statsLoading}
        />
      </div>

      {/* Modal flotante con los gráficos */}
      <VaccinationAnalyticsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        series={series}
        summary={summary}
        loading={chartLoading}
        error={chartError}
      />
    </div>
  );
};

export default VaccinationInsights;
