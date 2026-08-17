import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CalendarDays, TrendingUp } from 'lucide-react';

import { Skeleton } from '@/shared/ui/skeleton';
import type { VaccinationMonthlyPoint } from './vaccinationAnalytics';

const CHART_COLORS = {
  primary: '#059669',
  secondary: '#0ea5e9',
  grid: 'hsl(var(--border) / 0.55)',
  muted: 'hsl(var(--muted-foreground))',
};

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-muted-foreground">
        {payload[0].value} dosis aplicadas
      </p>
    </div>
  );
};

const ChartMessage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="flex h-full items-center justify-center rounded-md border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
    {children}
  </div>
);

const InsightsSkeleton = () => (
  <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
    <div className="rounded-lg border border-border bg-card p-4 lg:col-span-2">
      <Skeleton className="h-4 w-48" />
      <Skeleton className="mt-2 h-3 w-72 max-w-full" />
      <Skeleton className="mt-5 h-56 w-full" />
    </div>
    <div className="rounded-lg border border-border bg-card p-4">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="mt-5 h-48 w-full" />
    </div>
  </div>
);

interface VaccinationChartsProps {
  series: VaccinationMonthlyPoint[];
  loading: boolean;
  error: boolean;
  peakMonth: VaccinationMonthlyPoint | null;
}

export const VaccinationCharts: React.FC<VaccinationChartsProps> = ({
  series,
  loading,
  error,
  peakMonth,
}) => {
  if (loading) return <InsightsSkeleton />;

  return (
    <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-3">
      <section className="min-w-0 rounded-lg border border-border bg-card p-4 lg:col-span-2">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Evolución mensual
            </h2>
            <p className="text-xs text-muted-foreground">
              Dosis aplicadas durante los últimos 12 meses
            </p>
          </div>
          {peakMonth && (
            <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
              Pico: {peakMonth.label} ({peakMonth.count})
            </span>
          )}
        </div>

        <div className="mt-4 h-56 min-h-[220px] w-full sm:h-64">
          {error ? (
            <ChartMessage>No se pudo cargar la tendencia de vacunación.</ChartMessage>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="vaccinationTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.28} />
                    <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 11 }} />
                <RechartsTooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Dosis"
                  stroke={CHART_COLORS.primary}
                  strokeWidth={2.5}
                  fill="url(#vaccinationTrendFill)"
                  dot={{ r: 2, fill: CHART_COLORS.primary, strokeWidth: 0 }}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="min-w-0 rounded-lg border border-border bg-card p-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-foreground">
            <CalendarDays className="h-4 w-4 text-sky-600" />
            Actividad por mes
          </h2>
          <p className="text-xs text-muted-foreground">Comparación de dosis registradas</p>
        </div>

        <div className="mt-4 h-56 min-h-[220px] w-full sm:h-64">
          {error ? (
            <ChartMessage>La distribución mensual no está disponible.</ChartMessage>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 8, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: CHART_COLORS.muted, fontSize: 10 }} />
                <YAxis allowDecimals={false} hide />
                <RechartsTooltip content={<ChartTooltip />} />
                <Bar dataKey="count" name="Dosis" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
};

export default VaccinationCharts;
