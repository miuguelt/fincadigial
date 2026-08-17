/**
 * Comparación finca por finca.
 *
 * En pantalla ancha es una tabla; en el celular son tarjetas apiladas. Antes
 * era una sola tabla con `min-width: 900px`, así que en un teléfono de 320 px
 * había que arrastrar la pantalla a lo ancho tres veces para leer una fila:
 * el gesto menos usable que existe con una mano y guantes de trabajo.
 *
 * Las columnas de tipo y ubicación sólo aparecen desde `xl`, donde sobra
 * ancho; en el resto de tamaños ese dato vive en el panel de detalle.
 */
import { ChevronRight } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { cn } from '@/shared/ui/cn';
import {
  fincaLocation,
  formatCount,
  formatLiters,
  formatMoneyExact,
  formatMoneyShort,
  type FincaRow,
} from '../model/fincaMetrics';

interface FincaComparisonProps {
  rows: FincaRow[];
  selectedFincaId: number | null;
  onSelect: (fincaId: number) => void;
}

const InactiveBadge = () => (
  <span className="shrink-0 rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-950">
    Sin actividad
  </span>
);

const balanceClass = (balance: number) =>
  balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive';

const MobileCards = ({ rows, selectedFincaId, onSelect }: FincaComparisonProps) => (
  <ul className="space-y-2 lg:hidden">
    {rows.map((row) => {
      const isSelected = selectedFincaId === row.finca_id;
      return (
        <li key={row.finca_id}>
          <button
            type="button"
            onClick={() => onSelect(row.finca_id)}
            aria-pressed={isSelected}
            className={cn(
              'w-full rounded-xl border-2 bg-card p-3 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              isSelected ? 'border-primary' : 'border-border hover:bg-muted',
            )}
          >
            <span className="flex items-center gap-2">
              <FitText as="span" className="min-w-0 flex-1 text-base font-bold text-foreground">
                {row.finca_name}
              </FitText>
              {!row.finca_is_active && <InactiveBadge />}
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </span>

            <span className="mt-2 grid grid-cols-3 gap-2 border-t border-border pt-2">
              <span className="block">
                <span className="block text-[11px] font-medium text-muted-foreground">Animales</span>
                <FitText as="span" className="block text-sm font-bold text-foreground">
                  {formatCount(row.kpis.total_animals)}
                </FitText>
              </span>
              <span className="block">
                <span className="block text-[11px] font-medium text-muted-foreground">Leche</span>
                <FitText as="span" className="block text-sm font-bold text-sky-700 dark:text-sky-300">
                  {formatLiters(row.kpis.total_milk_liters)}
                </FitText>
              </span>
              <span className="block">
                <span className="block text-[11px] font-medium text-muted-foreground">Plata</span>
                <FitText
                  as="span"
                  title={formatMoneyExact(row.kpis.net_balance)}
                  className={cn('block text-sm font-bold', balanceClass(row.kpis.net_balance))}
                >
                  {formatMoneyShort(row.kpis.net_balance)}
                </FitText>
              </span>
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

const DesktopTable = ({ rows, selectedFincaId, onSelect }: FincaComparisonProps) => (
  <div className="hidden overflow-hidden rounded-2xl border border-border lg:block">
    <table className="w-full border-collapse text-left">
      <caption className="sr-only">Comparación de animales, leche y plata por finca</caption>
      <thead>
        <tr className="border-b border-border bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <th scope="col" className="px-4 py-3">Finca</th>
          <th scope="col" className="hidden px-4 py-3 xl:table-cell">Tipo</th>
          <th scope="col" className="hidden px-4 py-3 xl:table-cell">Dónde queda</th>
          <th scope="col" className="px-4 py-3 text-right">Animales</th>
          <th scope="col" className="px-4 py-3 text-right">Leche</th>
          <th scope="col" className="px-4 py-3 text-right">Plata</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border text-sm">
        {rows.map((row) => {
          const isSelected = selectedFincaId === row.finca_id;
          return (
            <tr key={row.finca_id} className={cn('transition-colors', isSelected ? 'bg-primary/10' : 'hover:bg-muted')}>
              <th scope="row" className="px-4 py-3 text-left font-semibold">
                <button
                  type="button"
                  onClick={() => onSelect(row.finca_id)}
                  aria-pressed={isSelected}
                  className="flex w-full items-center gap-2 rounded-lg text-left text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">{row.finca_name}</span>
                  {!row.finca_is_active && <InactiveBadge />}
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
              </th>
              <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">{row.finca_type}</td>
              <td className="hidden px-4 py-3 text-muted-foreground xl:table-cell">
                {fincaLocation(row) ?? 'Sin registrar'}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatCount(row.kpis.total_animals)}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-sky-700 dark:text-sky-300">
                {formatLiters(row.kpis.total_milk_liters)}
              </td>
              <td className={cn('px-4 py-3 text-right font-bold tabular-nums', balanceClass(row.kpis.net_balance))}>
                {formatMoneyExact(row.kpis.net_balance)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

export const FincaComparison = (props: FincaComparisonProps) => (
  <section aria-labelledby="comparar-fincas" className="space-y-3">
    <div>
      <h2 id="comparar-fincas" className="text-lg font-bold text-foreground">
        Comparar mis fincas
      </h2>
      <p className="text-xs text-muted-foreground">Toca una finca para ver su detalle aquí debajo.</p>
    </div>
    <MobileCards {...props} />
    <DesktopTable {...props} />
  </section>
);

export default FincaComparison;
