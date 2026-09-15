import React from 'react';
import { cn } from '@/shared/ui/cn';
import type { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * SectionHeader: Encabezado semántico estandarizado para bloques o secciones dentro de una vista.
 */
export function SectionHeader({
  title,
  description,
  icon: Icon,
  actions,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2', className)}>
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
            {title}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}

export default SectionHeader;
