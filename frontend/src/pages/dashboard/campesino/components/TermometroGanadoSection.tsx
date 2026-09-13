import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Scale,
  Sprout,
  Milk,
  ChevronRight,
} from 'lucide-react';
import { useCampesinoEstadisticas } from '../estadisticas/hooks/useCampesinoEstadisticas';

export const TermometroGanadoSection: React.FC = () => {
  const navigate = useNavigate();
  const {
    isLoading,
    healthGauge,
    weightStats,
    fieldStats,
    milkStats,
  } = useCampesinoEstadisticas();

  if (isLoading) {
    return (
      <div className="h-36 rounded-3xl bg-card border border-border/40 animate-pulse p-6" />
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.4 }}
      className="space-y-4 rounded-2xl border border-emerald-200/70 bg-card p-4 shadow-sm dark:border-emerald-900/30 sm:p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2.5 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <HeartPulse className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Termómetro de la Finca
            </h2>
            <p className="text-xs text-muted-foreground">
              Semáforo de salud, engorde y pastoreo hoy
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/campesino/estadisticas')}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 flex items-center gap-1 bg-emerald-100/70 dark:bg-emerald-900/40 px-3 py-1.5 rounded-xl transition-colors"
        >
          <span>Ver Más</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main KPI Bar & Oscillators Grid */}
      <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4 sm:gap-3">
        {/* Termómetro General */}
        <button
          type="button"
          onClick={() => navigate('/campesino/estadisticas?tab=termometro')}
          className="flex min-h-[112px] flex-col justify-between rounded-xl border border-border/60 bg-background p-3.5 text-left shadow-xs transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Salud del ganado</span>
            <span className="text-base font-black text-emerald-700 dark:text-emerald-400">
              {healthGauge.value}%
            </span>
          </div>
          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
            <div
              style={{ width: `${healthGauge.value}%` }}
              className="h-full bg-emerald-500 rounded-full"
            />
          </div>
          <p className="text-[11px] font-bold text-foreground mt-2 fit-clamp">
            {healthGauge.statusLabel}
          </p>
        </button>

        {/* Oscilador Engorde */}
        <button
          type="button"
          onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
          className="flex min-h-[112px] flex-col justify-between rounded-xl border border-border/60 bg-background p-3.5 text-left shadow-xs transition-all hover:border-lime-300 dark:hover:border-lime-700"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Engorde (ADG)</span>
            <Scale className="w-4 h-4 text-lime-600 dark:text-lime-400" />
          </div>
          <p className="text-xl font-black text-foreground">
            {weightStats.adgGrams > 0 ? `+${weightStats.adgGrams}` : weightStats.adgGrams}{' '}
            <span className="text-xs font-normal text-muted-foreground">g/día</span>
          </p>
          <p className={`text-[11px] font-bold mt-1 fit-clamp ${weightStats.adgStatusColor}`}>
            {weightStats.adgStatus === 'fast'
              ? '🟢 Rápido (+600g)'
              : weightStats.adgStatus === 'moderate'
              ? '🟡 Moderado'
              : '🔴 Lento'}
          </p>
        </button>

        {/* Oscilador Pastos */}
        <button
          type="button"
          onClick={() => navigate('/campesino/estadisticas?tab=potreros')}
          className="flex min-h-[112px] flex-col justify-between rounded-xl border border-border/60 bg-background p-3.5 text-left shadow-xs transition-all hover:border-green-300 dark:hover:border-green-700"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Pastoreo</span>
            <Sprout className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xl font-black text-foreground">
            {Math.round(fieldStats.utilizationPercent)}%{' '}
            <span className="text-xs font-normal text-muted-foreground">carga</span>
          </p>
          <p className="text-[11px] font-bold text-muted-foreground mt-1 fit-clamp">
            {fieldStats.restingFields} potreros descansando
          </p>
        </button>

        {/* Oscilador Leche */}
        <button
          type="button"
          onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
          className="flex min-h-[112px] flex-col justify-between rounded-xl border border-border/60 bg-background p-3.5 text-left shadow-xs transition-all hover:border-amber-300 dark:hover:border-amber-700"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase">Leche Promedio</span>
            <Milk className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-xl font-black text-foreground">
            {milkStats.avgLitersPerCow}{' '}
            <span className="text-xs font-normal text-muted-foreground">L / vaca</span>
          </p>
          <p className="text-[11px] font-bold text-amber-700 dark:text-amber-300 mt-1 fit-clamp">
            {milkStats.trendLabel}
          </p>
        </button>
      </div>
    </motion.section>
  );
};
