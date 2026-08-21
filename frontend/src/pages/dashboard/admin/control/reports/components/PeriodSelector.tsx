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
      className="grid grid-cols-2 gap-2"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`min-h-14 rounded-xl border-2 px-3 py-2 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
              active
                ? 'border-emerald-600 bg-emerald-50 text-emerald-950 dark:border-emerald-500 dark:bg-emerald-950/50 dark:text-emerald-50'
                : 'border-border bg-card text-muted-foreground hover:bg-muted'
            }`}
          >
            <span className="block text-sm font-extrabold leading-tight">{option.label}</span>
            <span className="mt-0.5 block text-xs font-medium leading-tight">{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
