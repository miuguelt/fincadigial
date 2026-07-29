import { AlertTriangle } from 'lucide-react';
import type { WeatherAlert } from '@/entities/weather';
import { cn } from '@/shared/ui/cn';

const SEVERITY: Record<string, string> = {
  low: 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100',
  medium:
    'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100',
  high: 'border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-100',
  critical:
    'border-red-400 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/40 dark:text-red-100',
};

/**
 * Alertas climáticas activas de la finca. El texto y la recomendación vienen del
 * backend (`weather_alerts`), aquí solo se pintan.
 */
export function WeatherAlertsRow({ alerts }: { alerts: WeatherAlert[] }) {
  if (!alerts.length) return null;

  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={cn(
            'flex items-start gap-2.5 rounded-xl border px-3 py-2.5',
            SEVERITY[alert.severity] ?? SEVERITY.medium,
          )}
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold leading-tight">{alert.title}</p>
            {alert.recommendation && (
              <p className="mt-0.5 text-xs leading-snug opacity-90">{alert.recommendation}</p>
            )}
          </div>
        </div>
      ))}
      {alerts.length > 3 && (
        <p className="text-xs font-semibold text-muted-foreground">
          +{alerts.length - 3} alertas más en Clima
        </p>
      )}
    </div>
  );
}
