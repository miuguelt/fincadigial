/**
 * Comparación de fincas en barras (animales, leche).
 *
 * Cada fila es un `<button>` real: antes era un `<div onClick>` y no había
 * forma de seleccionar una finca con el teclado ni de saber cuál estaba
 * activa con un lector de pantalla. La barra usa `barPercent`, que reserva un
 * mínimo visible para que una finca con un solo animal no se vea igual que
 * una en cero, y la escala se declara debajo para que el largo de la barra no
 * se confunda con una cantidad absoluta.
 */
import type { ComponentType } from 'react';
import { Check } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { cn } from '@/shared/ui/cn';
import { barPercent, type FincaRow } from '../model/fincaMetrics';

export interface FincaRankingCardProps {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  rows: FincaRow[];
  max: number;
  selectedFincaId: number | null;
  onSelect: (fincaId: number) => void;
  valueOf: (row: FincaRow) => number;
  formatValue: (value: number) => string;
  accentClassName: string;
  barClassName: string;
}

export const FincaRankingCard = ({
  title,
  description,
  icon: Icon,
  rows,
  max,
  selectedFincaId,
  onSelect,
  valueOf,
  formatValue,
  accentClassName,
  barClassName,
}: FincaRankingCardProps) => {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className={cn('mt-0.5 shrink-0 rounded-xl border border-border p-2', accentClassName)}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <FitText as="h2" className="text-base font-bold text-foreground sm:text-lg">
            {title}
          </FitText>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {rows.map((row) => {
          const value = valueOf(row);
          const isSelected = selectedFincaId === row.finca_id;

          return (
            <li key={row.finca_id}>
              <button
                type="button"
                onClick={() => onSelect(row.finca_id)}
                aria-pressed={isSelected}
                className={cn(
                  'w-full rounded-xl border p-3 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  isSelected ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted',
                )}
              >
                <span className="mb-2 flex items-center justify-between gap-3">
                  <FitText as="span" className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                    {row.finca_name}
                  </FitText>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" aria-label="Finca abierta" />}
                  <span className={cn('shrink-0 text-sm font-bold tabular-nums', accentClassName)}>
                    {formatValue(value)}
                  </span>
                </span>
                <span aria-hidden="true" className="block h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn(
                      'block h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none',
                      barClassName,
                    )}
                    style={{ width: `${barPercent(value, max)}%` }}
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] text-muted-foreground">
        La barra llena es la finca con más: {formatValue(max)}.
      </p>
    </section>
  );
};

export default FincaRankingCard;
