import React from 'react';
import { cn } from '@/shared/ui/cn';
import * as Icons from '@/shared/ui/icons';

/**
 * EmptyState: estado vacío humanizado con enfoque campesino-first.
 * Utiliza íconos Tabler y lenguaje natural.
 */
export interface EmptyStateProps {
  icon?: keyof typeof Icons | React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  // Para compatibilidad con la versión anterior:
  action?: React.ReactNode;
}

export function EmptyState({
  icon = 'IconClipboardList',
  title,
  description,
  actionLabel,
  onAction,
  className,
  action,
}: EmptyStateProps) {
  // Renderizar el ícono: puede ser una key de Icons o un ReactNode
  const renderIcon = () => {
    if (typeof icon === 'string' && (Icons as any)[icon]) {
      const IconComponent = (Icons as any)[icon] as React.ElementType;
      return <IconComponent size={40} className="text-primary opacity-80" />;
    }
    if (React.isValidElement(icon)) {
      return icon;
    }
    // Default
    return <Icons.IconClipboardList size={40} className="text-primary opacity-80" />;
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl border-2 border-dashed border-border/40 bg-muted/5 w-full max-w-2xl mx-auto my-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 mb-6">
        {renderIcon()}
      </div>

      <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
        {title}
      </h3>

      <p className="text-sm sm:text-base text-muted-foreground max-w-sm mb-8 leading-relaxed">
        {description}
      </p>

      {action || (actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20 font-bold px-8 py-4 h-auto hover:bg-primary/90 transition-all active:scale-95"
        >
          <Icons.IconPlus size={20} className="mr-2" />
          {actionLabel}
        </button>
      ))}
    </div>
  );
}

export default EmptyState;
