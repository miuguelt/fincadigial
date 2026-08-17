import React from 'react';
import { motion } from 'framer-motion';
import { Sprout, CheckCircle2, AlertTriangle, Sparkles, RefreshCw } from 'lucide-react';
import type { CampesinoFieldStats } from '../hooks/useCampesinoEstadisticas';

interface OsciladorCargaPotrerosProps {
  stats: CampesinoFieldStats;
}

export const OsciladorCargaPotreros: React.FC<OsciladorCargaPotrerosProps> = ({ stats }) => {
  const {
    totalFields,
    occupiedFields,
    restingFields,
    utilizationPercent,
    animalsPerField,
    status,
    statusLabel,
    statusColor,
    advice,
  } = stats;

  const clampUtil = Math.min(100, Math.max(0, utilizationPercent));

  return (
    <div className="rounded-3xl border border-green-200/80 bg-gradient-to-br from-green-50/70 via-background to-lime-50/30 p-5 sm:p-6 shadow-md dark:border-green-900/40 dark:from-green-950/20 dark:via-background dark:to-lime-950/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-green-500/10 text-green-600 dark:bg-green-400/10 dark:text-green-400">
            <Sprout className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Oscilador de Pastoreo y Carga de Potreros
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Presión sobre el pasto y rotación de lotes
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black border shadow-sm ${statusColor}`}
        >
          {status === 'optimal' && <CheckCircle2 className="w-4 h-4" />}
          {status === 'overgrazing' && <AlertTriangle className="w-4 h-4" />}
          {status === 'plenty' && <Sparkles className="w-4 h-4" />}
          {statusLabel}
        </span>
      </div>

      {/* Visual Stocking Pressure Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>0% (Pasto Sobrante)</span>
          <span className="text-foreground text-sm font-black">
            {Math.round(utilizationPercent)}% Capacidad Usada
          </span>
          <span>100%+ (Sobrepastoreo)</span>
        </div>

        {/* 3-Zone Pasture Bar */}
        <div className="relative h-6 w-full rounded-full bg-muted/40 overflow-hidden flex">
          <div className="w-[50%] h-full bg-sky-300/60 dark:bg-sky-950/60 flex items-center justify-center text-[10px] font-bold text-sky-800 dark:text-sky-300">
            Pasto Libre (&lt;50%)
          </div>
          <div className="w-[35%] h-full bg-emerald-300/60 dark:bg-emerald-950/60 flex items-center justify-center text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
            Carga Ideal (50-85%)
          </div>
          <div className="w-[15%] h-full bg-rose-300/60 dark:bg-rose-950/60 flex items-center justify-center text-[10px] font-bold text-rose-800 dark:text-rose-300">
            Límite
          </div>
        </div>

        {/* Animated Needle Marker */}
        <div className="relative w-full h-4">
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${clampUtil}%` }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center"
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-foreground" />
            <span className="text-[10px] font-extrabold text-foreground px-1.5 py-0.5 rounded bg-background border border-border shadow-xs mt-0.5 whitespace-nowrap">
              Carga: {Math.round(utilizationPercent)}%
            </span>
          </motion.div>
        </div>
      </div>

      {/* KPI Cards & Advice */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-center">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Potreros Totales</p>
            <p className="text-xl font-black text-foreground mt-0.5">{totalFields}</p>
            <p className="text-[10px] text-muted-foreground">de la finca</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
            <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase">En Descanso</p>
            <p className="text-xl font-black text-emerald-700 dark:text-emerald-300 mt-0.5">{restingFields}</p>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">rebrotando pasto</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-center">
            <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase">Ocupados</p>
            <p className="text-xl font-black text-amber-700 dark:text-amber-300 mt-0.5">{occupiedFields}</p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">con ganado</p>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-border/60 text-center">
            <p className="text-[11px] font-bold text-muted-foreground uppercase">Carga Promedio</p>
            <p className="text-xl font-black text-foreground mt-0.5">{animalsPerField}</p>
            <p className="text-[10px] text-muted-foreground">animales / potrero</p>
          </div>
        </div>

        <div className="lg:col-span-4 p-4 rounded-2xl bg-card border border-border/60 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
            <RefreshCw className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Rotación Recomendada:</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {advice}
          </p>
        </div>
      </div>
    </div>
  );
};
