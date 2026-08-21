import React from 'react';
import { motion } from 'framer-motion';
import { HeartPulse, ShieldCheck, Stethoscope, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { CampesinoKpiGauge } from '../hooks/useCampesinoEstadisticas';

interface TermometroHatoGaugeProps {
  gauge: CampesinoKpiGauge;
  vacCoverage?: number;
  controlComp?: number;
  activeAnimals?: number;
  sickAnimals?: number;
}

export const TermometroHatoGauge: React.FC<TermometroHatoGaugeProps> = ({
  gauge,
  vacCoverage = 100,
  controlComp = 100,
  activeAnimals = 0,
  sickAnimals = 0,
}) => {
  const value = Math.max(0, Math.min(100, gauge.value));
  // Needle angle: 0% is -90deg (left), 100% is +90deg (right)
  const angle = -90 + (value / 100) * 180;

  const healthyAnimals = Math.max(0, activeAnimals - sickAnimals);

  return (
    <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-background to-teal-50/40 p-5 sm:p-6 shadow-md dark:border-emerald-900/40 dark:from-emerald-950/30 dark:via-background dark:to-teal-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <HeartPulse className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Termómetro general del ganado
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Semáforo de salud, vacunación y controles de la finca
            </p>
          </div>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 self-start sm:self-auto px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-black border shadow-sm ${gauge.statusColor}`}
        >
          {gauge.status === 'optimal' && <CheckCircle2 className="w-4 h-4" />}
          {gauge.status === 'warning' && <AlertTriangle className="w-4 h-4" />}
          {gauge.status === 'critical' && <AlertTriangle className="w-4 h-4" />}
          {gauge.statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Radial Semi-Circle Gauge */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center">
          <div className="relative w-64 h-36 flex items-end justify-center overflow-hidden">
            {/* SVG Arc Track */}
            <svg viewBox="0 0 200 110" className="w-full h-full">
              {/* Background gradient definitions */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />   {/* Rose / Red */}
                  <stop offset="50%" stopColor="#f59e0b" />  {/* Amber / Yellow */}
                  <stop offset="85%" stopColor="#10b981" />  {/* Emerald / Green */}
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Background track arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="currentColor"
                strokeWidth="16"
                strokeLinecap="round"
                className="text-muted/30"
              />

              {/* Colored active arc */}
              <path
                d="M 20 100 A 80 80 0 0 1 180 100"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="16"
                strokeLinecap="round"
              />

              {/* Center pivot */}
              <circle cx="100" cy="100" r="8" className="fill-foreground" />
            </svg>

            {/* Animated Needle */}
            <motion.div
              initial={{ rotate: -90 }}
              animate={{ rotate: angle }}
              transition={{ type: 'spring', stiffness: 60, damping: 15 }}
              style={{ originX: '50%', originY: '100%' }}
              className="absolute bottom-0 w-1.5 h-20 bg-foreground rounded-full shadow-lg"
            >
              <div className="w-3 h-3 bg-emerald-500 rounded-full -top-1.5 -left-0.75 absolute border-2 border-background" />
            </motion.div>
          </div>

          <div className="text-center mt-2">
            <span className="text-4xl sm:text-5xl font-black text-foreground tracking-tight">
              {value}%
            </span>
            <p className="text-xs font-semibold text-muted-foreground mt-0.5">
              Estado Operativo y Sanitario
            </p>
          </div>
        </div>

        {/* Breakdown Sub-KPIs and Advice */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-card border border-border/60 shadow-sm">
            <p className="text-xs font-bold text-foreground mb-1">💡 Consejo del Mayordomo:</p>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {gauge.advice}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {/* Vacunas */}
            <div className="p-3 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-center">
              <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Vacunas</p>
              <p className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300">
                {Math.round(vacCoverage)}%
              </p>
              <p className="text-[11px] text-muted-foreground">al día</p>
            </div>

            {/* Controles de Peso */}
            <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200/60 dark:border-sky-800/40 text-center">
              <Stethoscope className="w-5 h-5 text-sky-600 dark:text-sky-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Controles</p>
              <p className="text-base sm:text-lg font-black text-sky-700 dark:text-sky-300">
                {Math.round(controlComp)}%
              </p>
              <p className="text-[11px] text-muted-foreground">pesajes al día</p>
            </div>

            {/* Sanos vs Enfermos */}
            <div className="p-3 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 text-center">
              <HeartPulse className="w-5 h-5 text-amber-600 dark:text-amber-400 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase">Sanos</p>
              <p className="text-base sm:text-lg font-black text-foreground">
                {healthyAnimals} <span className="text-xs text-muted-foreground">/ {activeAnimals}</span>
              </p>
              <p className="text-[11px] text-muted-foreground">{sickAnimals} en cura</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
