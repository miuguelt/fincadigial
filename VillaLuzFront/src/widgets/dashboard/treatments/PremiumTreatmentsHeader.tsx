import React, { useMemo } from 'react';
import { HeartPulse, Calendar, TrendingUp } from 'lucide-react';
import KPICard from '@/widgets/analytics/KPICard';
import { TreatmentResponse } from '@/shared/api/generated/swaggerTypes';

interface PremiumTreatmentsHeaderProps {
  items: Array<TreatmentResponse & { [k: string]: any }>;
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
      }

      const diag = (item.diagnosis || '').trim();
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
      topDiagnoses
    };
  }, [items]);

  return (
    <div className="mb-6 space-y-6">
      {/* Header Premium */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-card/40 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-xl shadow-purple-500/20">
            <HeartPulse className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
              Salud y <span className="text-purple-500">Tratamientos</span>
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground font-medium mt-1">
              Monitoreo clínico, insumos aplicados y control de salud (Offline-Ready)
            </p>
          </div>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <KPICard title="Total Tratamientos" value={metrics.totalTreatments} icon="📋" />
        <KPICard title="Animales Tratados" value={metrics.uniqueAnimalsCount} icon="🐄" />
        <KPICard title="Tratamientos (30d)" value={metrics.recentTreatments} icon={<Calendar className="w-5 h-5 text-purple-500" />} />
        <KPICard 
          title="Top Diagnóstico" 
          value={metrics.topDiagnoses[0]?.name || 'Ninguno'} 
          icon={<TrendingUp className="w-5 h-5 text-indigo-500" />} 
        />
      </div>

      {/* Top Diagnósticos Frecuentes */}
      {metrics.topDiagnoses.length > 0 && (
        <div className="bg-card/40 backdrop-blur-xl rounded-[2.5rem] border border-border/50 shadow-2xl shadow-primary/5 p-6 sm:p-8">
          <h2 className="text-lg font-black text-foreground mb-6">Diagnósticos Más Frecuentes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.topDiagnoses.map((diag, index) => {
              const gradients = [
                'from-rose-500 to-pink-500',
                'from-purple-500 to-indigo-500',
                'from-blue-500 to-cyan-500',
                'from-amber-500 to-orange-500'
              ];
              const gradientClass = gradients[index] || 'from-primary to-primary-foreground';

              return (
                <div key={index} className="p-5 bg-background/50 rounded-lg border border-border/50 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-foreground transition-colors truncate max-w-[80%]">
                      {diag.name}
                    </h3>
                    <span className="text-[10px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded font-bold">
                      #{index + 1}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-2xl font-black text-foreground">{diag.count}</span>
                    <span className="text-xs font-bold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                      {diag.percentage}% del total
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className={`h-full rounded-full bg-gradient-to-r ${gradientClass} transition-all duration-1000`} style={{ width: `${diag.percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
