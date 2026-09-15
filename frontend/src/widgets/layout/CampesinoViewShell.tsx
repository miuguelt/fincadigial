import type { ReactNode } from 'react';
import { cn } from '@/shared/ui/cn';
import { ModuleHeading } from './ModuleHeading';

interface CampesinoViewShellProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  leading?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
}

/** Shared frame for every top-level campesino view. */
export function CampesinoViewShell({
  title,
  description,
  icon,
  actions,
  leading,
  children,
  className,
  contentClassName,
  headerClassName,
}: CampesinoViewShellProps) {
  return (
    <div className={cn('min-h-full bg-background text-foreground', className)}>
      <div className={cn('w-full space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8', contentClassName)}>
        <header
          className={cn(
            'flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between',
            headerClassName,
          )}
        >
          <div className="flex min-w-0 flex-1 items-start gap-3">
            {leading}
            <ModuleHeading
              title={title}
              description={description}
              icon={icon}
              titleClassName="text-xl sm:text-2xl"
            />
          </div>
          {actions ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
              {actions}
            </div>
          ) : null}
        </header>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export default CampesinoViewShell;
