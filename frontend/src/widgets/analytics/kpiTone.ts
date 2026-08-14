/**
 * kpiTone — color de un KPI según su variación.
 *
 * Estaba en línea dentro de `KPICard` como seis ternarios encadenados. Se
 * extrajo para que el componente cupiera en los límites de complejidad del
 * proyecto al añadirle el ajuste tipográfico.
 */
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export interface KpiTone {
  isNeutral: boolean;
  isPositive: boolean;
  changeColor: string;
  bgColor: string;
  chartColor: string;
  accentGradient: string;
  BadgeIcon: typeof Minus;
}

const NEUTRAL: Omit<KpiTone, 'isNeutral' | 'isPositive'> = {
  changeColor: 'text-slate-600 dark:text-slate-400',
  bgColor: 'bg-slate-100 dark:bg-slate-800',
  chartColor: 'var(--color-slate-400, #94a3b8)',
  accentGradient: 'from-slate-400 via-slate-300 to-slate-200',
  BadgeIcon: Minus,
};

const GOOD: Omit<KpiTone, 'isNeutral' | 'isPositive'> = {
  changeColor: 'text-emerald-700 dark:text-emerald-400',
  bgColor: 'bg-emerald-50 dark:bg-emerald-950/60',
  chartColor: 'var(--color-success-500, #10b981)',
  accentGradient: 'from-emerald-500 via-teal-400 to-cyan-300',
  BadgeIcon: ArrowUp,
};

const BAD: Omit<KpiTone, 'isNeutral' | 'isPositive'> = {
  changeColor: 'text-rose-700 dark:text-rose-400',
  bgColor: 'bg-rose-50 dark:bg-rose-950/60',
  chartColor: 'var(--color-danger-500, #f43f5e)',
  accentGradient: 'from-rose-500 via-pink-400 to-orange-300',
  BadgeIcon: ArrowDown,
};

export function getKpiTone(change: number | undefined | null, goodWhenHigher: boolean): KpiTone {
  const hasChange = change !== undefined && change !== null;
  const isNeutral = !hasChange || change === 0;
  const isPositive = hasChange ? (goodWhenHigher ? change >= 0 : change <= 0) : true;
  const palette = isNeutral ? NEUTRAL : isPositive ? GOOD : BAD;
  return { isNeutral, isPositive, ...palette };
}
