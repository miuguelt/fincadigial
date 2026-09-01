import type { ReportPeriod } from '../reportPeriod';

interface PeriodSelectorProps {
  value: ReportPeriod;
  onChange: (period: ReportPeriod) => void;
}

const OPTIONS: { value: ReportPeriod; label: string; hint: string }[] = [
  { value: 'semana', label: 'Últimos 7 días', hint: 'Cómo va la semana' },
  { value: 'mes', label: 'Mes en curso', hint: 'Del día 1 hasta hoy' },
];

/** Dos botones grandes: en el campo se toca con el dedo, no se despliega un menú. */
export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Periodo del reporte"
      className="grid grid-cols-2 gap-3"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-[60px] rounded-2xl border p-3.5 text-left transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
              active
                ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-emerald-500/5 to-card text-emerald-950 shadow-sm dark:border-emerald-400/30 dark:text-emerald-100'
                : 'border-border/70 bg-muted/30 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <span className="block text-sm font-black leading-tight text-foreground">{option.label}</span>
            <span className="mt-1 block text-xs font-medium text-muted-foreground">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
