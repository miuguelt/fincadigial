/**
 * KPIHeading — título, cifra e icono de un `KPICard`.
 *
 * El título y el valor se ajustan al ancho en vez de recortarse: un KPI que
 * dice «Producción de le…» o «1.234.5…» no informa de nada. El valor admite
 * una reducción mayor porque las cifras largas son el caso que más aprieta.
 * Ver docs/estandar-texto-adaptable.md.
 */
import React from 'react';
import { cn } from '@/shared/ui/cn.ts';
import { FitText } from '@/shared/ui/FitText';

export interface KPIHeadingProps {
  title: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  compact?: boolean;
}

export const KPIHeading: React.FC<KPIHeadingProps> = ({
  title,
  value,
  unit,
  icon,
  compact = false,
}) => (
  <div className={cn('flex items-start justify-between', compact ? 'mb-0' : 'mb-3')}>
    <div className="space-y-0.5 flex-1 min-w-0 pr-3">
      <FitText
        as="h3"
        minScale={0.75}
        className="text-[11px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground group-hover:text-primary/80 transition-colors"
      >
        {title}
      </FitText>
      <div className="flex items-baseline gap-1 mt-1">
        <FitText
          as="p"
          minScale={0.5}
          className={cn(
            'min-w-0 flex-1 font-black tracking-tighter text-foreground tabular-nums leading-none',
            compact ? 'text-xl' : 'text-3xl',
          )}
        >
          {value}
        </FitText>
        {unit && (
          <span className="text-sm font-bold text-muted-foreground/60 mb-0.5 shrink-0">{unit}</span>
        )}
      </div>
    </div>
    {icon && (
      <div
        className={cn(
          'rounded-xl bg-card border border-border/60 flex-shrink-0 group-hover:border-primary/30 group-hover:scale-110 transition-all duration-300',
          compact ? 'p-1.5' : 'p-2.5',
        )}
      >
        {icon}
      </div>
    )}
  </div>
);

export default KPIHeading;
