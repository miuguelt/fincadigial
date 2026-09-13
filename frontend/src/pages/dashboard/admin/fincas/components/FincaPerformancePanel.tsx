import React from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  CircleDollarSign,
  Droplets,
  Gauge,
  PawPrint,
  Trees,
  WalletCards,
} from 'lucide-react';
import type { FarmAdminKpis } from '../types';
import {
  calculateAnimalsPerField,
  formatFincaDecimal,
  formatFincaLiters,
  formatFincaMoney,
  formatFincaMoneyShort,
  formatFincaNumber,
} from './fincaPerformance';

interface FincaPerformancePanelProps {
  kpis?: FarmAdminKpis;
  compact?: boolean;
  loading?: boolean;
  error?: boolean;
  lastUpdated?: number;
}

interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  caption?: string;
  tone: 'emerald' | 'sky' | 'amber' | 'violet' | 'rose';
  compact?: boolean;
}

const toneStyles: Record<MetricCardProps['tone'], string> = {
  emerald: 'border-emerald-200/80 bg-emerald-50/70 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300',
  sky: 'border-sky-200/80 bg-sky-50/70 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300',
  amber: 'border-amber-200/80 bg-amber-50/70 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300',
  violet: 'border-violet-200/80 bg-violet-50/70 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300',
  rose: 'border-rose-200/80 bg-rose-50/70 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300',
};

const MetricCard: React.FC<MetricCardProps> = ({ icon, label, value, caption, tone, compact = false }) => (
  <div className={`min-w-0 rounded-xl border shadow-sm transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-md ${compact ? 'p-2.5' : 'p-3'} ${toneStyles[tone]}`}>
    <div className="flex items-center justify-between gap-2">
      <span className={`flex shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm dark:bg-black/20 ${compact ? 'h-6 w-6' : 'h-8 w-8'}`}>
        {icon}
      </span>
      <span className={`min-w-0 text-right font-bold uppercase opacity-75 ${compact ? 'whitespace-nowrap text-[11px] tracking-[0.02em]' : 'fit-clamp text-[11px] tracking-[0.1em]'}`}>{label}</span>
    </div>
    <p className={`mt-3 whitespace-nowrap font-black tabular-nums tracking-tight text-foreground ${compact ? 'text-sm sm:text-base' : 'text-lg'}`} title={value}>
      {value}
    </p>
    {caption && <p className="mt-0.5 fit-clamp text-[11px] font-medium opacity-75">{caption}</p>}
  </div>
);

const formatUpdatedAt = (timestamp?: number) => {
  if (!timestamp) return null;
  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
};

export const FincaPerformancePanel: React.FC<FincaPerformancePanelProps> = ({
  kpis,
  compact = false,
  loading = false,
  error = false,
  lastUpdated,
}) => {
  if (!kpis && loading) {
    return (
      <div className="rounded-2xl border border-border/70 bg-card/80 p-4 shadow-sm" aria-live="polite">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
          Consultando indicadores de rendimiento…
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      </div>
    );
  }

  if (!kpis && error) {
    return (
      <div className="rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-300" role="alert">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-bold">No se pudieron cargar los indicadores</p>
            <p className="mt-1 text-xs leading-relaxed opacity-80">La información administrativa sigue disponible. Intenta actualizar la vista para consultar el rendimiento.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!kpis) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4 text-sm text-muted-foreground" role="status">
        <div className="flex items-start gap-3">
          <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div>
            <p className="font-bold text-foreground">Indicadores aún no disponibles</p>
            <p className="mt-1 text-xs leading-relaxed">La ficha conserva la información administrativa. Los indicadores aparecen cuando el servicio de análisis comparte datos operativos.</p>
          </div>
        </div>
      </div>
    );
  }

  const income = kpis.total_income;
  const expenses = kpis.total_expenses;
  const netBalance = kpis.net_balance ?? (income !== undefined || expenses !== undefined ? (income || 0) - (expenses || 0) : undefined);
  const margin = income && income > 0 && netBalance !== undefined ? `${formatFincaDecimal((netBalance / income) * 100)}%` : '—';
  const milkPerAnimal = kpis.total_animals && kpis.total_animals > 0 && kpis.total_milk_liters !== undefined
    ? `${formatFincaDecimal(kpis.total_milk_liters / kpis.total_animals)} L`
    : '—';

  const metrics: MetricCardProps[] = compact
    ? [
        { icon: <PawPrint className="h-3.5 w-3.5" />, label: 'Ganado', value: formatFincaNumber(kpis.total_animals), caption: 'vivos', tone: 'emerald', compact: true },
        { icon: <Droplets className="h-3.5 w-3.5" />, label: 'Leche', value: formatFincaLiters(kpis.total_milk_liters), caption: 'acumulada', tone: 'sky', compact: true },
        { icon: <CircleDollarSign className="h-3.5 w-3.5" />, label: 'Balance', value: formatFincaMoneyShort(netBalance), caption: netBalance !== undefined && netBalance >= 0 ? 'positivo' : 'por revisar', tone: netBalance !== undefined && netBalance < 0 ? 'rose' : 'amber', compact: true },
      ]
    : [
        { icon: <PawPrint className="h-4 w-4" />, label: 'Ganado vivo', value: formatFincaNumber(kpis.total_animals), caption: 'animales registrados', tone: 'emerald' },
        { icon: <Droplets className="h-4 w-4" />, label: 'Leche', value: formatFincaLiters(kpis.total_milk_liters), caption: 'litros acumulados', tone: 'sky' },
        { icon: <ArrowUpRight className="h-4 w-4" />, label: 'Ingresos', value: formatFincaMoney(income), caption: 'movimientos registrados', tone: 'violet' },
        { icon: <ArrowDownRight className="h-4 w-4" />, label: 'Gastos', value: formatFincaMoney(expenses), caption: 'movimientos registrados', tone: 'rose' },
        { icon: <WalletCards className="h-4 w-4" />, label: 'Balance neto', value: formatFincaMoney(netBalance), caption: netBalance !== undefined && netBalance >= 0 ? 'resultado positivo' : 'resultado por revisar', tone: netBalance !== undefined && netBalance < 0 ? 'rose' : 'amber' },
        { icon: <Trees className="h-4 w-4" />, label: 'Potreros', value: formatFincaNumber(kpis.total_fields), caption: kpis.total_fields_area !== undefined ? `${formatFincaDecimal(kpis.total_fields_area)} ha` : 'área sin registrar', tone: 'emerald' },
      ];

  return (
    <section className="rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/[0.04] p-4 shadow-[0_14px_32px_-24px_rgba(15,23,42,0.55)] sm:p-5" aria-labelledby={compact ? undefined : 'finca-performance-title'}>
      {!compact && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-primary">Medición operativa</p>
            <h3 id="finca-performance-title" className="mt-1 text-base font-black text-foreground">Indicadores de rendimiento</h3>
            <p className="mt-1 text-xs text-muted-foreground">Cifras consolidadas para revisar productividad y resultado financiero.</p>
          </div>
          {formatUpdatedAt(lastUpdated) && <span className="rounded-full border border-border/70 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">Corte: {formatUpdatedAt(lastUpdated)}</span>}
        </div>
      )}

      <div className={compact ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6'}>
        {metrics.map((metric) => <MetricCard key={metric.label} {...metric} compact={compact} />)}
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border/60 pt-4 text-xs sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-muted-foreground">Animales por potrero</p>
            <p className="mt-1 font-black text-foreground">{calculateAnimalsPerField(kpis.total_animals, kpis.total_fields)}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-muted-foreground">Leche por animal</p>
            <p className="mt-1 font-black text-foreground">{milkPerAnimal}</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/60 p-3">
            <p className="text-muted-foreground">Margen neto</p>
            <p className="mt-1 font-black text-foreground">{margin}</p>
          </div>
        </div>
      )}
    </section>
  );
};

export default FincaPerformancePanel;
