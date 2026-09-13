import { cn } from '@/shared/ui/cn';

export interface FilterChipItem {
  key: string;
  label: string;
  count?: number;
}

interface FilterChipsProps {
  items: FilterChipItem[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}

const CHIP_BASE =
  'min-h-10 px-3 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background';

/** Fila de filtros por tipo, compartida por las pestañas de labores e historial. */
export function FilterChips({ items, active, onChange, ariaLabel }: FilterChipsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label={ariaLabel}>
      {items.map(item => {
        const selected = active === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onChange(item.key)}
            aria-pressed={selected}
            className={cn(
              CHIP_BASE,
              selected
                ? 'bg-primary-700 text-primary-foreground border-primary-700'
                : 'bg-card text-muted-foreground border-border hover:border-primary hover:text-primary',
            )}
          >
            {item.label}
            {item.count != null && ` (${item.count})`}
          </button>
        );
      })}
    </div>
  );
}
