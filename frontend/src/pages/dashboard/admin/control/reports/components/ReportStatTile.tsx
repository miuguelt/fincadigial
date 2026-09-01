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
  bien: 'text-emerald-600 dark:text-emerald-400',
  alerta: 'text-red-600 dark:text-red-400',
} as const;

/** Dato suelto del reporte: número grande, etiqueta corta, estilo Bento Grid. */
export function ReportStatTile({
  label,
  value,
  unit,
  hint,
  icon: Icon,
  tone = 'neutral',
}: ReportStatTileProps) {
  return (
    <div className="flex min-h-[96px] flex-col justify-between rounded-2xl border border-border/80 bg-gradient-to-br from-card to-muted/20 p-4 text-card-foreground shadow-sm transition-all duration-200 hover:border-border">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        </div>
      </div>
      <div className="mt-2">
        {value === null ? (
          <p className="text-sm font-bold text-muted-foreground">Sin datos</p>
        ) : (
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className={`text-2xl font-black tracking-tight ${TONE_CLASS[tone]}`}>{value}</span>
            {unit && <span className="text-xs font-semibold text-muted-foreground">{unit}</span>}
          </p>
        )}
        {hint && <p className="mt-0.5 text-xs font-medium text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}
