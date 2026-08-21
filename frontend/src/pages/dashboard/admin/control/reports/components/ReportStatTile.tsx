import type { LucideIcon } from 'lucide-react';

interface ReportStatTileProps {
  label: string;
  /** Ya formateado en es-CO; null muestra "sin datos" en vez de un cero falso. */
  value: string | null;
  unit?: string;
  hint?: string;
  icon: LucideIcon;
  tone?: 'neutral' | 'bien' | 'alerta';
}

const TONE_CLASS = {
  neutral: 'text-foreground',
  bien: 'text-emerald-700 dark:text-emerald-300',
  alerta: 'text-red-700 dark:text-red-300',
} as const;

/** Dato suelto del reporte: número grande, etiqueta corta, sin adornos. */
export function ReportStatTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
}: ReportStatTileProps) {
  return (
    <div className="flex min-h-[92px] flex-col justify-between rounded-xl border border-border bg-card p-3 text-card-foreground">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-bold leading-snug text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
      <div className="mt-1.5">
        {value === null ? (
          <p className="text-sm font-bold text-muted-foreground">Sin datos</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-x-1">
            <span className={`text-2xl font-black tracking-tight ${TONE_CLASS[tone]}`}>{value}</span>
            {unit && <span className="text-xs font-semibold text-muted-foreground">{unit}</span>}
          </p>
        )}
        {hint && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
