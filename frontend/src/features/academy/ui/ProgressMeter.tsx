import React from 'react';
import { Progress } from '@/shared/ui/progress';

interface ProgressMeterProps {
  label: string;
  detail: string;
  value: number;
  ariaLabel: string;
  className?: string;
  indicatorClassName?: string;
}

/** Etiqueta + barra de avance, con el mismo ritmo visual en todas las vistas de academia. */
export const ProgressMeter: React.FC<ProgressMeterProps> = ({
  label,
  detail,
  value,
  ariaLabel,
  className = 'h-2',
  indicatorClassName,
}) => (
  <div className="space-y-1.5">
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{detail}</span>
    </div>
    <Progress
      value={value}
      className={className}
      indicatorClassName={indicatorClassName}
      aria-label={ariaLabel}
    />
  </div>
);

export default ProgressMeter;
