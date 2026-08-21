import React from 'react';
import { Milk, TrendingUp, TrendingDown, Minus, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/ui/button';
import type { CampesinoMilkStats } from '../hooks/useCampesinoEstadisticas';

interface OsciladorProduccionLecheraProps {
  stats: CampesinoMilkStats;
}

export const OsciladorProduccionLechera: React.FC<OsciladorProduccionLecheraProps> = ({ stats }) => {
  const navigate = useNavigate();
  const { totalLiters, avgLitersPerCow, trend, trendLabel, advice } = stats;

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 via-background to-orange-50/30 p-5 sm:p-6 shadow-md dark:border-amber-900/40 dark:from-amber-950/20 dark:via-background dark:to-orange-950/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <Milk className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Oscilador de Leche y Ordeño
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Producción diaria y promedio en el balde
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${
              trend === 'up'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : trend === 'down'
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                : 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }`}
          >
            {trend === 'up' && <TrendingUp className="w-3.5 h-3.5" />}
            {trend === 'down' && <TrendingDown className="w-3.5 h-3.5" />}
            {trend === 'stable' && <Minus className="w-3.5 h-3.5" />}
            {trendLabel}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Litros */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Litros Acumulados</p>
            <p className="text-2xl sm:text-3xl font-black text-foreground mt-1">
              {totalLiters.toLocaleString('es-CO')} <span className="text-sm font-bold text-muted-foreground">L</span>
            </p>
          </div>
              <p className="text-[11px] text-muted-foreground mt-2">Producción registrada en el ganado</p>
        </div>

        {/* Promedio por Vaca */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase">Promedio por Vaca</p>
            <p className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-300 mt-1">
              {avgLitersPerCow > 0 ? `${avgLitersPerCow} L/día` : '0 L'}
            </p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Rendimiento por animal ordeñado</p>
        </div>

        {/* Consejo & Acción */}
        <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-xs flex flex-col justify-between">
          <div>
            <p className="text-xs font-bold text-foreground">💡 Estado del Ordeño:</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {advice}
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="mt-3 w-full border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300"
            onClick={() => navigate('/campesino/registro-operativo?modal=milk')}
          >
            <PlusCircle className="w-3.5 h-3.5 mr-1" />
            Registrar Ordeño
          </Button>
        </div>
      </div>
    </div>
  );
};
