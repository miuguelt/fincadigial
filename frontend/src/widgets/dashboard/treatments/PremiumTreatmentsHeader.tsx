import React, { useMemo } from 'react';
import { HeartPulse, Calendar, TrendingUp, AlertTriangle, DollarSign, Stethoscope } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { TreatmentResponse } from '@/shared/api/generated/swaggerTypes';

interface PremiumTreatmentsHeaderProps {
  items: Array<TreatmentResponse & { [k: string]: any }>;
}

/**
 * Formatea moneda en Pesos Colombianos (COP) compactos
 */
function formatCompactCOP(amount: number): string {
  if (!amount || isNaN(amount)) return '$ 0';
  if (amount >= 1_000_000) {
    return `$ ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `$ ${(amount / 1_000).toFixed(0)}k`;
  }
  return `$ ${amount.toLocaleString('es-CO')}`;
}

export const PremiumTreatmentsHeader: React.FC<PremiumTreatmentsHeaderProps> = ({ items }) => {
  const metrics = useMemo(() => {
    const totalTreatments = items.length;

    // Animales únicos
    const uniqueAnimals = new Set<number>();
    // Tratamientos en los últimos 30 días
    let recentTreatments = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let activeWithdrawals = 0;
    let totalCost = 0;
    const diagCount: Record<string, number> = {};

    items.forEach(item => {
      if (item.animal_id) {
        uniqueAnimals.add(Number(item.animal_id));
      }

      if (item.treatment_date) {
        const tDate = new Date(String(item.treatment_date));
        if (tDate >= thirtyDaysAgo) {
          recentTreatments++;
        }

        // Verificación de período de retiro
        const withdrawalDays = Number(item.withdrawal_days) || 0;
        if (withdrawalDays > 0 || item.withdrawal_end_date) {
          let endDate: Date;
          if (item.withdrawal_end_date) {
            endDate = new Date(String(item.withdrawal_end_date));
          } else {
            endDate = new Date(tDate);
            endDate.setDate(endDate.getDate() + withdrawalDays);
          }
          endDate.setHours(0, 0, 0, 0);
          if (endDate >= today) {
            activeWithdrawals++;
          }
        }
      }

      // Costo
      if (item.cost !== undefined && item.cost !== null) {
        const c = Number(item.cost);
        if (!isNaN(c)) totalCost += c;
      }

      const diag = (item.diagnosis || item.description || '').trim();
      if (diag) {
        diagCount[diag] = (diagCount[diag] || 0) + 1;
      }
    });

    const topDiagnoses = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalTreatments > 0 ? Math.round((count / totalTreatments) * 100) : 0
      }));

    return {
      totalTreatments,
      uniqueAnimalsCount: uniqueAnimals.size,
      recentTreatments,
      activeWithdrawals,
      totalCost,
      topDiagnoses
    };
  }, [items]);

  return (
    <DataScreenHeader
      icon={<HeartPulse className="h-5 w-5 text-white" />}
      iconClassName="from-purple-500 to-purple-600 shadow-purple-500/20"
      title={<>Salud y <span className="text-purple-500">Tratamientos</span></>}
      description="Monitoreo clínico veterinario, insumos aplicados, control de retiros y salud animal"
      metricsColumns={6}
      metrics={
        <>
          <KPICard compact title="Total Tratamientos" value={metrics.totalTreatments} icon="📋" />
          <KPICard compact title="Animales Tratados" value={metrics.uniqueAnimalsCount} icon="🐄" />
          <KPICard
            compact
            title="Retiro Activo"
            value={metrics.activeWithdrawals > 0 ? `${metrics.activeWithdrawals} en retiro` : '0 activos'}
            icon={<AlertTriangle className={`w-4 h-4 ${metrics.activeWithdrawals > 0 ? 'text-amber-500 animate-pulse' : 'text-emerald-500'}`} />}
          />
          <KPICard
            compact
            title="Inversión Salud"
            value={formatCompactCOP(metrics.totalCost)}
            icon={<DollarSign className="w-4 h-4 text-emerald-500" />}
          />
          <KPICard compact title="Tratamientos (30d)" value={metrics.recentTreatments} icon={<Calendar className="w-4 h-4 text-purple-500" />} />
          <KPICard
            compact
            title="Top Diagnóstico"
            value={metrics.topDiagnoses[0]?.name || 'Ninguno'}
            icon={<TrendingUp className="w-4 h-4 text-indigo-500" />}
          />
        </>
      }
    >
      {/* Top Diagnósticos Frecuentes - Optimizado para campo y móvil */}
      {metrics.topDiagnoses.length > 0 && (
        <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-border/40 shadow-sm p-2.5 sm:p-3">
          <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
            <h2 className="text-xs sm:text-xs font-black text-foreground flex items-center gap-1.5 uppercase tracking-wider">
              <Stethoscope className="w-3.5 h-3.5 text-purple-500 shrink-0" />
              Diagnósticos Frecuentes
            </h2>
            <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-2 py-0.5 rounded-full">
              Finca Villaluz
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {metrics.topDiagnoses.map((diag, index) => {
              const gradients = [
                'from-rose-500 to-pink-500',
                'from-purple-500 to-indigo-500',
                'from-blue-500 to-cyan-500',
                'from-amber-500 to-orange-500'
              ];
              const gradientClass = gradients[index] || 'from-primary to-primary-foreground';

              return (
                <div key={index} className="p-2 sm:p-2.5 bg-background/50 rounded-xl border border-border/40 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <h3 className="text-[11px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors fit-clamp max-w-[80%]" title={diag.name}>
                      {diag.name}
                    </h3>
                    <span className="text-[11px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1 rounded font-bold">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-base sm:text-lg font-black text-foreground">{diag.count}</span>
                    <span className="text-[11px] font-bold text-muted-foreground bg-muted/40 px-1.5 py-0.2 rounded">
                      {diag.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-muted/60 rounded-full h-1 sm:h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-1000`} style={{ width: `${diag.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DataScreenHeader>
  );
};
export default PremiumTreatmentsHeader;
