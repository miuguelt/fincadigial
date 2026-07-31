import type { LucideIcon } from 'lucide-react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type PulseTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const toneMap: Record<PulseTone, { bar: string; icon: string; value: string }> = {
  neutral: {
    bar: 'bg-slate-400',
    icon: 'bg-muted text-muted-foreground',
    value: 'text-foreground',
  },
  success: {
    bar: 'bg-emerald-500',
    icon: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    value: 'text-foreground',
  },
  warning: {
    bar: 'bg-amber-500',
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    value: 'text-amber-700 dark:text-amber-300',
  },
  danger: {
    bar: 'bg-rose-500',
    icon: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    value: 'text-rose-700 dark:text-rose-300',
  },
  info: {
    bar: 'bg-sky-500',
    icon: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    value: 'text-foreground',
  },
};

export interface PulseTileProps {
  label: string;
  value: number | string;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: PulseTone;
  /** Variación porcentual frente al periodo anterior. */
  delta?: number | null;
  /** Si subir es bueno (animales) o malo (alertas). */
  deltaGoodWhenHigher?: boolean;
  onClick?: () => void;
}

/**
 * Tarjeta de indicador del pulso de la finca: un solo número grande, legible
 * a distancia y con un toque de color que dice si hay que actuar o no.
 */
export function PulseTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
  delta,
  deltaGoodWhenHigher = true,
  onClick,
}: PulseTileProps) {
  const config = toneMap[tone];
  const displayValue = typeof value === 'number' ? value.toLocaleString('es-CO') : value;

  const hasDelta = typeof delta === 'number' && Number.isFinite(delta) && delta !== 0;
  const deltaIsGood = hasDelta ? (deltaGoodWhenHigher ? delta > 0 : delta < 0) : true;
  const DeltaIcon = hasDelta && delta > 0 ? ArrowUp : ArrowDown;

  const content = (
    <>
      <span className={cn('absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl', config.bar)} />
      <span className="flex items-start justify-between gap-2">
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', config.icon)}>
          <Icon className="h-4 w-4" />
        </span>
        {hasDelta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
              deltaIsGood
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                : 'bg-rose-500/10 text-rose-700 dark:text-rose-400',
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
      </span>
      <span className="mt-2 block">
        <span className={cn('block text-2xl font-black leading-none tabular-nums sm:text-3xl', config.value)}>
          {displayValue}
          {unit && <span className="ml-0.5 text-base font-bold text-muted-foreground">{unit}</span>}
        </span>
        <span className="mt-1.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </span>
        {hint && <span className="mt-0.5 block truncate text-[11px] text-muted-foreground/80">{hint}</span>}
      </span>
    </>
  );

  const baseClass =
    'relative min-h-[112px] overflow-hidden rounded-xl border border-border bg-card px-3.5 py-3 pl-4 text-left shadow-sm transition';

  if (!onClick) {
    return <div className={baseClass}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${label}: ${displayValue}${unit ?? ''}`}
      className={cn(baseClass, 'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40')}
    >
      {content}
    </button>
  );
}

export default PulseTile;
