import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export interface SectionHeadingProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * Encabezado uniforme de sección del dashboard: un icono, qué es y para qué
 * sirve, más un único acceso al módulo completo.
 */
export function SectionHeading({ icon: Icon, title, subtitle, actionLabel, onAction }: SectionHeadingProps) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 flex-1 flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-muted/50 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 className="fit-clamp text-base font-black leading-tight tracking-tight text-foreground sm:text-lg">{title}</h2>
          {subtitle && <p className="fit-clamp text-xs text-muted-foreground sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction} className="h-9 gap-1.5 rounded-lg">
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export default SectionHeading;
