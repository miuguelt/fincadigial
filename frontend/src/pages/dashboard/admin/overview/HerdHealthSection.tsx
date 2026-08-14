import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ClipboardCheck,
  HeartPulse,
  Pill,
  ShieldCheck,
  ShoppingCart,
  Skull,
  Stethoscope,
  TrendingUp,
  ListChecks,
} from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn } from '@/shared/lib/utils';
import { Badge } from '@/shared/ui/badge';
import type { KpiCardSummary } from '@/features/dashboard/model/useCompleteDashboardStats';
import KPICard from '@/widgets/analytics/KPICard';
import SectionHeading from './SectionHeading';

/** KPIs que un productor mira todos los días; el resto queda plegado. */
const PRIMARY_KPIS = ['health_index', 'vaccination_coverage', 'control_compliance', 'mortality_rate_30d'];

/** KPIs donde subir es malo. */
const LOWER_IS_BETTER = new Set([
  'mortality_rate_30d',
  'sales_rate_30d',
  'alert_pressure',
  'task_load_index',
]);

const KPI_ICONS: Record<string, React.ReactNode> = {
  health_index: <HeartPulse className="w-5 h-5 text-rose-500" />,
  vaccination_coverage: <ShieldCheck className="w-5 h-5 text-emerald-600" />,
  control_compliance: <Stethoscope className="w-5 h-5 text-sky-600" />,
  mortality_rate_30d: <Skull className="w-5 h-5 text-zinc-600" />,
  sales_rate_30d: <ShoppingCart className="w-5 h-5 text-amber-600" />,
  treatments_intensity: <Pill className="w-5 h-5 text-indigo-600" />,
  controls_frequency: <ClipboardCheck className="w-5 h-5 text-sky-600" />,
  herd_growth_rate: <TrendingUp className="w-5 h-5 text-emerald-700" />,
  alert_pressure: <AlertTriangle className="w-5 h-5 text-rose-600" />,
  task_load_index: <ListChecks className="w-5 h-5 text-orange-600" />,
};

const renderKpi = (card: KpiCardSummary) => {
  const unit = card.unidad || undefined;
  const value = typeof card.valor === 'number' && unit === '%' ? card.valor.toFixed(1) : card.valor;

  return (
    <KPICard
      key={card.id}
      title={card.titulo}
      value={value}
      unit={unit}
      change={card.cambio}
      icon={KPI_ICONS[card.id] ?? (card.icono ? <span>{card.icono}</span> : null)}
      subtitle={card.descripcion}
      goodWhenHigher={!LOWER_IS_BETTER.has(card.id)}
    />
  );
};

export interface HerdHealthSectionProps {
  cards: KpiCardSummary[];
  ventanaDias?: number;
  trend: Array<{ name: string; value: number }>;
  onOpenAnalytics: () => void;
}

/**
 * Salud del ganado: los cuatro indicadores que deciden el manejo sanitario y la
 * curva de salud del último mes. Los indicadores secundarios quedan plegados
 * para no saturar la vista de entrada.
 */
export function HerdHealthSection({ cards, ventanaDias, trend, onOpenAnalytics }: HerdHealthSectionProps) {
  const [showMore, setShowMore] = useState(false);

  const { primary, secondary } = useMemo(() => {
    const primaryCards = PRIMARY_KPIS.map((id) => cards.find((card) => card.id === id)).filter(
      (card): card is KpiCardSummary => Boolean(card),
    );
    const primaryIds = new Set(primaryCards.map((card) => card.id));
    return {
      primary: primaryCards,
      secondary: cards.filter((card) => !primaryIds.has(card.id)),
    };
  }, [cards]);

  const trendChange = useMemo(() => {
    if (trend.length < 2) return null;
    const first = trend[0]?.value ?? 0;
    const last = trend[trend.length - 1]?.value ?? 0;
    return Math.round((last - first) * 10) / 10;
  }, [trend]);

  if (!primary.length && !secondary.length && !trend.length) return null;

  return (
    <section>
      <SectionHeading
        icon={HeartPulse}
        title="Salud del ganado"
        subtitle={
          ventanaDias
            ? `Indicadores sanitarios de los últimos ${ventanaDias} días`
            : 'Indicadores sanitarios del ganado'
        }
        actionLabel="Ver analítica"
        onAction={onOpenAnalytics}
      />

      {primary.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))]">{primary.map(renderKpi)}</div>
      )}

      {trend.length > 0 && (
        <div className="mt-4 rounded-xl border border-border bg-card p-4 shadow-sm min-w-0 overflow-hidden">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-foreground">Tendencia del índice de salud</h3>
              <p className="text-xs text-muted-foreground">Evolución de los últimos 30 días</p>
            </div>
            {trendChange !== null && (
              <Badge
                variant="outline"
                className={cn(
                  'tabular-nums',
                  trendChange >= 0
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400',
                )}
              >
                {trendChange >= 0 ? '+' : ''}
                {trendChange} pts
              </Badge>
            )}
          </div>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="herdHealthTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={11} width={40} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                  }}
                  formatter={(value: number) => [`${value}`, 'Índice de salud']}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--primary)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#herdHealthTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {secondary.length > 0 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowMore((prev) => !prev)}
            aria-expanded={showMore}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-card px-4 py-3 text-left shadow-sm transition hover:border-primary/40"
          >
            <span className="text-sm font-bold text-foreground">
              {showMore ? 'Ocultar' : 'Ver'} indicadores complementarios
              <span className="ml-2 text-xs font-medium text-muted-foreground">({secondary.length})</span>
            </span>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showMore && 'rotate-180')} />
          </button>

          {showMore && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(auto-fit,_minmax(200px,_1fr))]">{secondary.map(renderKpi)}</div>
          )}
        </div>
      )}
    </section>
  );
}

export default HerdHealthSection;
