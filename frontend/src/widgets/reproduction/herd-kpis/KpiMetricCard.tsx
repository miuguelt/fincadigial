import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { cn } from '@/shared/ui/cn';
import type { KpiStatus } from '@/entities/reproduction/model/herdKpis.types';

/**
 * Tarjeta de un indicador reproductivo con su meta y su semáforo.
 *
 * El semáforo llega resuelto desde el servidor: aquí solo se traduce a color,
 * para que la finca y la API nunca discrepen sobre qué es aceptable.
 */

export interface KpiMetricCardProps {
  label: string;
  value: number | null;
  unit?: string;
  target?: number | null;
  status?: KpiStatus | null;
  /** Tamaño de la muestra que respalda el promedio. */
  sample?: number;
  hint?: string;
  icon?: React.ReactNode;
}

const STATUS_STYLES: Record<KpiStatus, { border: string; bg: string; text: string; label: string }> = {
  ok: {
    border: 'border-l-emerald-500',
    bg: 'bg-emerald-500/5',
    text: 'text-emerald-600',
    label: 'En meta',
  },
  warn: {
    border: 'border-l-amber-500',
    bg: 'bg-amber-500/5',
    text: 'text-amber-600',
    label: 'Por revisar',
  },
  bad: {
    border: 'border-l-rose-500',
    bg: 'bg-rose-500/5',
    text: 'text-rose-600',
    label: 'Fuera de meta',
  },
};

const NEUTRAL = {
  border: 'border-l-slate-400',
  bg: 'bg-muted/30',
  text: 'text-muted-foreground',
  label: 'Sin datos',
};

/** Formatea con separadores colombianos y hasta un decimal. */
const formatValue = (value: number | null): string =>
  value === null || Number.isNaN(value)
    ? '—'
    : value.toLocaleString('es-CO', { maximumFractionDigits: 1 });

export const KpiMetricCard: React.FC<KpiMetricCardProps> = ({
  label,
  value,
  unit,
  target,
  status,
  sample,
  hint,
  icon,
}) => {
  const style = status ? STATUS_STYLES[status] : NEUTRAL;
  const hasValue = value !== null && value !== undefined;

  return (
    <Card className={cn('border-l-4 min-w-0', style.border, style.bg)}>
      <CardContent className="p-4 space-y-2 min-w-0">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground min-w-0 fit-clamp">
            {label}
          </span>
          {icon ? <span className="shrink-0">{icon}</span> : null}
        </div>

        <div className="flex items-baseline gap-1 min-w-0">
          <span className={cn('text-2xl font-black leading-none', hasValue ? 'text-foreground' : 'text-muted-foreground')}>
            {formatValue(value)}
          </span>
          {unit && hasValue ? (
            <span className="text-xs font-semibold text-muted-foreground">{unit}</span>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
          <span className={cn('font-bold', style.text)}>{style.label}</span>
          {target !== null && target !== undefined ? (
            <span className="text-muted-foreground">
              Meta {formatValue(target)}{unit ? ` ${unit}` : ''}
            </span>
          ) : null}
          {sample !== undefined ? (
            <span className="text-muted-foreground">n = {sample}</span>
          ) : null}
        </div>

        {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
};

export default KpiMetricCard;
