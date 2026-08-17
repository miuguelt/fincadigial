import React from 'react';
import { motion } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { COLORS } from '@/shared/utils/colors';
import { getDiseaseLabel } from './analyticsAdapters';

interface ExecutiveHealthProps {
  healthTimeSeries: any;
  enfermedadesComunes: any[];
  healthyControlRate: number | null;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border/50 p-3 rounded-xl shadow-xl backdrop-blur-xl">
        <p className="text-sm font-bold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-xs font-medium">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="text-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const ExecutiveHealth: React.FC<ExecutiveHealthProps> = ({
  healthTimeSeries,
  enfermedadesComunes,
  healthyControlRate
}) => {
  const chartData = healthTimeSeries?.labels?.map((label: string, index: number) => {
    const dataObj: any = { period: label };
    healthTimeSeries.datasets.forEach((dataset: any) => {
      dataObj[dataset.label] = dataset.data[index];
    });
    return dataObj;
  }) || [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Gráfico principal de evolución */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="lg:col-span-3 bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Evolución Sanitaria</h2>
            <p className="text-xs text-muted-foreground mt-1">Tratamientos vs Vacunaciones por periodo</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: COLORS.charts.primary }} />
              <span>Tratamientos</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-md" style={{ backgroundColor: COLORS.charts.secondary }} />
              <span>Vacunaciones</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTratamientos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.charts.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.charts.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorVacunas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.charts.secondary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={COLORS.charts.secondary} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border)/0.4)" />
                <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Tratamientos" stroke={COLORS.charts.primary} strokeWidth={3} fillOpacity={1} fill="url(#colorTratamientos)" />
                <Area type="monotone" dataKey="Vacunaciones" stroke={COLORS.charts.secondary} strokeWidth={3} fillOpacity={1} fill="url(#colorVacunas)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos suficientes</div>
          )}
        </div>
      </motion.div>

      {/* Enfermedades comunes y Success Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="flex flex-col gap-6"
      >
        <div className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Controles en buen estado</h2>
          <div className="flex flex-col items-center justify-center h-32 relative">
            <svg className="w-24 h-24 transform -rotate-90">
              <circle cx="48" cy="48" r="36" stroke="hsl(var(--muted)/0.3)" strokeWidth="8" fill="none" />
              <motion.circle
                cx="48" cy="48" r="36"
                stroke={COLORS.charts.primary}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 36}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 36 }}
                animate={{ strokeDashoffset: (2 * Math.PI * 36) * (1 - ((healthyControlRate ?? 0) / 100)) }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-foreground">{healthyControlRate === null ? '—' : `${healthyControlRate}%`}</span>
            </div>
          </div>
        </div>

        <div className="bg-card/40 dark:bg-card/20 backdrop-blur-xl border border-border/50 rounded-xl p-6 shadow-sm flex-1">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Casos Comunes</h2>
          {enfermedadesComunes.length > 0 ? (
            <div className="space-y-3">
              {enfermedadesComunes.slice(0, 4).map((disease, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">{getDiseaseLabel(disease)}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-danger-500/10 text-danger-600 dark:text-danger-400">{disease.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center">Sin registros recientes</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
