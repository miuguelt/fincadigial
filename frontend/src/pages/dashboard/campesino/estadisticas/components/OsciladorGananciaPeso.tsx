import React from 'react';
import { motion } from 'framer-motion';
import { Scale, TrendingUp, Award, ArrowUpRight } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import type { CampesinoWeightStats } from '../hooks/useCampesinoEstadisticas';

interface OsciladorGananciaPesoProps {
  stats: CampesinoWeightStats;
}

export const OsciladorGananciaPeso: React.FC<OsciladorGananciaPesoProps> = ({ stats }) => {
  const { adgGrams, adgStatusLabel, adgStatusColor, bestPerformer, trends } = stats;

  // Percentage on 0 - 1000g bar
  const percentOnScale = Math.min(100, Math.max(0, (adgGrams / 1000) * 100));

  return (
    <div className="rounded-3xl border border-lime-200/80 bg-gradient-to-br from-lime-50/70 via-background to-emerald-50/30 p-5 sm:p-6 shadow-md dark:border-lime-900/40 dark:from-lime-950/20 dark:via-background dark:to-emerald-950/10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lime-500/10 text-lime-600 dark:bg-lime-400/10 dark:text-lime-400">
            <Scale className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">
              Oscilador de Engorde y Peso (Báscula)
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ritmo diario de ganancia de kilos en el lote
            </p>
          </div>
        </div>

        <span className={`text-sm font-black flex items-center gap-1 ${adgStatusColor}`}>
          <TrendingUp className="w-4 h-4" />
          {adgStatusLabel}
        </span>
      </div>

      {/* Horizontal Momentum Oscillator Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/60 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
          <span>0 g/día (Perdiendo)</span>
          <span className="text-foreground text-sm font-black">
            {adgGrams > 0 ? `+${adgGrams} g/día` : `${adgGrams} g/día`}
          </span>
          <span>1.000 g/día (Excelente)</span>
        </div>

        {/* 3-Zone Momentum Track */}
        <div className="relative h-6 w-full rounded-full bg-muted/40 overflow-hidden flex">
          {/* Slow Zone: 0 - 35% */}
          <div className="w-[35%] h-full bg-rose-300/60 dark:bg-rose-950/60 flex items-center justify-center text-[11px] font-bold text-rose-800 dark:text-rose-300">
            Lento
          </div>
          {/* Moderate Zone: 35 - 60% */}
          <div className="w-[25%] h-full bg-amber-300/60 dark:bg-amber-950/60 flex items-center justify-center text-[11px] font-bold text-amber-800 dark:text-amber-300">
            Normal
          </div>
          {/* Fast Zone: 60 - 100% */}
          <div className="w-[40%] h-full bg-emerald-300/60 dark:bg-emerald-950/60 flex items-center justify-center text-[11px] font-bold text-emerald-800 dark:text-emerald-300">
            Óptimo (+600g)
          </div>
        </div>

        {/* Animated Pointer / Marker */}
        <div className="relative w-full h-4">
          <motion.div
            initial={{ left: '0%' }}
            animate={{ left: `${percentOnScale}%` }}
            transition={{ type: 'spring', stiffness: 70, damping: 14 }}
            className="absolute -top-1 -translate-x-1/2 flex flex-col items-center"
          >
            <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-foreground" />
            <span className="text-[11px] font-extrabold text-foreground px-1.5 py-0.5 rounded bg-background border border-border shadow-xs mt-0.5 whitespace-nowrap">
              Tu ganado: {adgGrams}g
            </span>
          </motion.div>
        </div>
      </div>

      {/* Grid: Trends Chart & Best Performer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Evolution Chart */}
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              📈 Evolución del Peso Promedio (Últimos Meses)
            </h4>
            <span className="text-[11px] text-muted-foreground">Kilos en Báscula</span>
          </div>

          <div className="h-44 w-full bg-card/60 p-2 rounded-2xl border border-border/50">
            {trends.length >= 2 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                  <XAxis dataKey="monthLabel" tick={{ fontSize: 11 }} />
                  <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} unit=" kg" />
                  <Tooltip
                    formatter={(val: any) => [`${val} kg`, 'Peso Promedio']}
                    labelFormatter={(label) => `Mes: ${label}`}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgWeight"
                    stroke="#65a30d"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#weightGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 text-xs text-muted-foreground">
                <Scale className="w-6 h-6 mb-1 opacity-40" />
                <p>Registre al menos 2 pesajes para trazar la curva de crecimiento del ganado.</p>
              </div>
            )}
          </div>
        </div>

        {/* Best Performer Card */}
        <div className="lg:col-span-4 space-y-3">
          {bestPerformer ? (
            <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-100/70 to-yellow-50/50 dark:from-amber-950/40 dark:to-yellow-950/20 border border-amber-300/80 dark:border-amber-800/40 shadow-xs">
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  El Más Rendidor
                </span>
              </div>
              <p className="text-xl font-black text-foreground">{bestPerformer.record}</p>
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" />
                Ganando +{bestPerformer.dailyGainGrams} g/día
              </p>
              <p className="text-[11px] text-muted-foreground mt-2">
                Este animal tiene la mejor conversión de pasto a carne de la finca.
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-card border border-border/60 text-xs text-muted-foreground text-center">
              <p className="font-bold text-foreground mb-1">💡 Consejo de Ceba:</p>
              <p>El pesaje mensual permite identificar a los animales que más rinden y a los que se están quedando atrasados.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
