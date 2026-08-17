import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Syringe } from 'lucide-react';

import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import { vaccinationsService } from '@/entities/vaccination/api/vaccinations.service';
import KPICard from '@/widgets/analytics/KPICard';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';
import { Button } from '@/shared/ui/button';
import {
  buildVaccinationSeries,
  shouldRefreshVaccinationAnalytics,
  summarizeVaccinationSeries,
} from './vaccinationAnalytics';
import VaccinationCharts from './VaccinationCharts';

export const VaccinationInsights: React.FC = () => {
  const [showCharts, setShowCharts] = useState(false);
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
    <DataScreenHeader
      title="Vacunaciones"
      description="Seguimiento de dosis aplicadas y actividad sanitaria de la finca"
      icon={<Syringe className="h-5 w-5 text-white" />}
      iconClassName="from-emerald-500 to-emerald-600 shadow-emerald-500/20"
      actions={
        <Button
          variant="outline"
          size="sm"
          aria-expanded={showCharts}
          onClick={() => setShowCharts((visible) => !visible)}
        >
          {showCharts ? 'Ocultar gráficos' : 'Ver gráficos'}
        </Button>
      }
      metricsColumns={4}
      metrics={
        <>
          <KPICard
            compact
            title="Total registradas"
            value={summary.total}
            icon="💉"
            subtitle="Histórico"
            loading={statsLoading}
          />
          <KPICard
            compact
            title="Últimos 12 meses"
            value={summary.periodTotal}
            icon="📅"
            subtitle="Dosis aplicadas"
            loading={chartLoading}
          />
          <KPICard
            compact
            title="Promedio mensual"
            value={summary.averagePerMonth}
            icon="📈"
            subtitle={`${summary.activeMonths} meses con actividad`}
            loading={chartLoading}
          />
          <KPICard
            compact
            title="Registradas hoy"
            value={summary.recentToday}
            icon="✓"
            subtitle="Nuevas dosis"
            loading={statsLoading}
          />
        </>
      }
    >
      <SanidadTabs />

      {showCharts && (
        <VaccinationCharts
          series={series}
          loading={chartLoading}
          error={chartError}
          peakMonth={summary.peakMonth}
        />
      )}
    </DataScreenHeader>
  );
};

export default VaccinationInsights;
