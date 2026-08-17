/**
 * Resumen de todas las fincas juntas.
 *
 * Pensado para leerse de un vistazo con el celular en la mano y a pleno sol:
 * fondo sólido (nada de tarjetas translúcidas), etiquetas en el idioma de la
 * finca —animales, leche, plata, tierra— y ninguna letra por debajo de 11 px.
 * La plata se abrevia a millones porque `$90.596.777,90` no cabe ni se lee en
 * una tarjeta de 136 px; el valor exacto queda en el `title` y en la tabla.
 */
import type { ComponentType, ReactNode } from 'react';
import { Building2, Beef, Milk, Wallet, Trees } from 'lucide-react';
import { FitText } from '@/shared/ui/FitText';
import { cn } from '@/shared/ui/cn';
import {
  formatArea,
  formatCount,
  formatLiters,
  formatMoneyExact,
  formatMoneyShort,
  type ConsolidatedTotals,
} from '../model/fincaMetrics';

interface SummaryCardProps {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: ReactNode;
  accent: string;
  valueClassName?: string;
  title?: string;
  className?: string;
}

const SummaryCard = ({ icon: Icon, label, value, hint, accent, valueClassName, title, className }: SummaryCardProps) => (
  <div
    className={cn(
      'flex flex-col gap-1 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5',
      className,
    )}
  >
    <div className="flex items-center gap-2">
      <Icon className={cn('h-5 w-5 shrink-0', accent)} aria-hidden="true" />
      <FitText as="span" className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground">
        {label}
      </FitText>
    </div>
    <FitText
      as="p"
      minScale={0.7}
      title={title}
      className={cn('text-2xl font-black leading-tight text-foreground sm:text-3xl', valueClassName)}
    >
      {value}
    </FitText>
    <p className="text-[11px] font-medium leading-snug text-muted-foreground">{hint}</p>
  </div>
);

export const ConsolidatedSummary = ({ totals }: { totals: ConsolidatedTotals }) => {
  const inactive = totals.farms - totals.activeFarms;

  return (
    <section aria-label="Resumen de todas las fincas" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      <SummaryCard
        icon={Building2}
        label="Fincas"
        value={formatCount(totals.activeFarms)}
        accent="text-emerald-600 dark:text-emerald-400"
        hint={inactive > 0 ? `en uso, ${formatCount(inactive)} sin actividad` : 'en uso'}
      />
      <SummaryCard
        icon={Beef}
        label="Animales"
        value={formatCount(totals.animals)}
        accent="text-amber-600 dark:text-amber-400"
        hint="vivos, contando todas las fincas"
      />
      <SummaryCard
        icon={Milk}
        label="Leche"
        value={formatLiters(totals.milk)}
        accent="text-sky-600 dark:text-sky-400"
        hint="todo lo registrado hasta hoy"
      />
      <SummaryCard
        icon={Wallet}
        label="Plata"
        value={formatMoneyShort(totals.balance)}
        title={formatMoneyExact(totals.balance)}
        accent={totals.balance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}
        valueClassName={totals.balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-destructive'}
        hint={totals.balance >= 0 ? 'entró más de lo que salió' : 'salió más de lo que entró'}
      />
      <SummaryCard
        icon={Trees}
        label="Tierra"
        value={formatArea(totals.area)}
        accent="text-lime-700 dark:text-lime-400"
        hint="hectáreas sumando los potreros"
        className="col-span-2 sm:col-span-1"
      />
    </section>
  );
};

export default ConsolidatedSummary;
