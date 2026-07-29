import { cn } from '@/shared/ui/cn';
import type { MetricTone, WeatherMetricItem } from '../FincaHeroBanner.types';

const TONES: Record<MetricTone, string> = {
  sky: 'border-sky-200/70 bg-sky-50/80 text-sky-900 dark:border-sky-800/50 dark:bg-sky-950/40 dark:text-sky-100',
  amber:
    'border-amber-200/70 bg-amber-50/80 text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/40 dark:text-amber-100',
  emerald:
    'border-emerald-200/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-800/50 dark:bg-emerald-950/40 dark:text-emerald-100',
  violet:
    'border-violet-200/70 bg-violet-50/80 text-violet-900 dark:border-violet-800/50 dark:bg-violet-950/40 dark:text-violet-100',
  rose: 'border-rose-200/70 bg-rose-50/80 text-rose-900 dark:border-rose-800/50 dark:bg-rose-950/40 dark:text-rose-100',
  slate:
    'border-border bg-muted/60 text-foreground dark:border-border dark:bg-muted/30',
};

/**
 * Casilla climática. Alto mínimo de 64px para que se pueda leer y tocar sin
 * precisión en un celular de gama baja.
 */
export function WeatherMetric({ item }: { item: WeatherMetricItem }) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        'flex min-h-[64px] items-center gap-2.5 rounded-xl border px-3 py-2.5',
        TONES[item.tone],
      )}
    >
      <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase leading-none tracking-wider opacity-70">
          {item.label}
        </p>
        <p className="mt-1 truncate text-base font-black leading-none tabular-nums sm:text-lg">
          {item.value}
        </p>
        {item.hint && (
          <p className="mt-1 truncate text-[10px] leading-none opacity-70">{item.hint}</p>
        )}
      </div>
    </div>
  );
}
