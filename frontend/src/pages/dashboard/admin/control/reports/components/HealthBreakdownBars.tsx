import type { HealthBreakdown, HealthBucketKey } from '../controlReport';
import { formatNumber } from '../reportExport';

interface HealthBreakdownBarsProps {
  breakdown: HealthBreakdown;
}

const BAR_CLASS: Record<HealthBucketKey, string> = {
  sano: 'bg-emerald-600 dark:bg-emerald-500',
  observacion: 'bg-amber-500 dark:bg-amber-400',
  grave: 'bg-red-600 dark:bg-red-500',
  desconocido: 'bg-slate-400 dark:bg-slate-500',
};

/**
 * Estado del ganado según el último control de cada animal. Cada barra lleva su
 * conteo escrito: el color acompaña, no es el único indicador.
 */
export function HealthBreakdownBars({ breakdown }: HealthBreakdownBarsProps) {
  if (breakdown.total === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
        Todavía no hay revisiones registradas para clasificar el ganado.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5">
      {breakdown.buckets.map((bucket) => (
        <li key={bucket.key}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold">{bucket.label}</span>
            <span className="shrink-0 text-sm font-semibold text-muted-foreground">
              {bucket.count} de {breakdown.total} ({formatNumber(bucket.percentage, 0)} %)
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full ${BAR_CLASS[bucket.key]}`}
              style={{ width: `${bucket.percentage}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
