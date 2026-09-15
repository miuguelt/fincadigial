import { cn } from '@/shared/ui/cn';
import type { MetricTone, WeatherMetricItem } from '../FincaHeroBanner.types';

const ICON_TONES: Record<MetricTone, string> = {
  sky: 'text-sky-600 dark:text-sky-400',
  amber: 'text-amber-600 dark:text-amber-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  violet: 'text-purple-600 dark:text-purple-400',
  rose: 'text-rose-600 dark:text-rose-400',
  slate: 'text-muted-foreground',
};

/**
 * Casilla de métrica climática.
 * Sigue el estándar de tarjetas sobrias y legibles con icono acentuado.
 */
export function WeatherMetric({ item }: { item: WeatherMetricItem }) {
  const Icon = item.icon;
  return (
    <div
      className={cn(
        'flex min-h-[64px] items-center gap-2.5 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 shadow-2xs transition-colors hover:bg-muted/20 dark:bg-card/50',
      )}
    >
      <div className={cn('p-1.5 rounded-lg bg-muted/40 shrink-0', ICON_TONES[item.tone])}>
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase leading-none tracking-wider text-muted-foreground">
          {item.label}
        </p>
        <p className="mt-1 fit-clamp text-sm font-bold leading-none tabular-nums text-foreground sm:text-base">
          {item.value}
        </p>
        {item.hint && (
          <p className="mt-1 text-[11px] leading-tight text-muted-foreground fit-clamp">{item.hint}</p>
        )}
      </div>
    </div>
  );
}
