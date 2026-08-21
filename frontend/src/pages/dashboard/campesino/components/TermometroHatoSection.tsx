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

export const TermometroHatoSection: React.FC = () => {
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
      className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-card to-teal-50/30 p-5 sm:p-6 shadow-md dark:border-emerald-900/30 dark:from-emerald-950/20 dark:via-card dark:to-teal-950/10 space-y-4"
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
        {/* Termómetro General */}
        <div
          onClick={() => navigate('/campesino/estadisticas?tab=termometro')}
          className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
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
        </div>

        {/* Oscilador Engorde */}
        <div
          onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
          className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-lime-300 dark:hover:border-lime-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
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
        </div>

        {/* Oscilador Pastos */}
        <div
          onClick={() => navigate('/campesino/estadisticas?tab=potreros')}
          className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-green-300 dark:hover:border-green-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
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
        </div>

        {/* Oscilador Leche */}
        <div
          onClick={() => navigate('/campesino/estadisticas?tab=engorde_leche')}
          className="p-3.5 rounded-2xl bg-card border border-border/60 hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
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
        </div>
      </div>
    </motion.section>
  );
};
