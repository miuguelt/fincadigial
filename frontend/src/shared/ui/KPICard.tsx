import React from 'react';
import { cn } from '@/shared/ui/cn';
import { Card, CardHeader, CardDescription, CardContent, CardTitle } from '@/shared/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { BadgeStatus } from '@/shared/utils/badgeStyles';

/**
 * KPICard — Tarjeta estandarizada para métricas y KPIs.
 *
 * Usa `Card` internamente. El color de acento se deriva del `status` semántico
 * (success, warning, danger, info, neutral, primary) en lugar de colores ad-hoc.
 *
 * @example
 * ```tsx
 * import { KPICard } from '@/shared/ui/KPICard';
 * import { Heart } from 'lucide-react';
 *
 * <KPICard
 *   label="Preñeces Activas"
 *   value={23}
 *   subtitle="Hembras gestantes confirmadas"
 *   icon={Heart}
 *   status="info"
 * />
 * ```
 */
export interface KPICardProps {
  /** Etiqueta corta de la métrica (ej: "Preñeces Activas"). */
  label: string;
  /** Valor principal de la métrica. */
  value: string | number;
  /** Texto secundario bajo el valor. */
  subtitle?: string;
  /** Ícono Lucide de la métrica. */
  icon?: LucideIcon;
  /** Estado semántico que define el color de acento. */
  status?: BadgeStatus;
  /** Modo compacto para uso dentro de headers o grids densos. */
  compact?: boolean;
  /** Muestra esqueleto de carga. */
  loading?: boolean;
  /** Contenido adicional junto al valor (badges, indicadores). */
  extra?: React.ReactNode;
  /** Clases CSS adicionales para el contenedor. */
  className?: string;
}

/** Mapeo de status → clases de color para el borde izquierdo y el ícono. */
const STATUS_STYLES: Record<string, { border: string; iconBg: string; iconText: string }> = {
  success: {
    border: 'border-l-success',
    iconBg: 'bg-success/10',
    iconText: 'text-success',
  },
  warning: {
    border: 'border-l-warning',
    iconBg: 'bg-warning/10',
    iconText: 'text-warning',
  },
  danger: {
    border: 'border-l-destructive',
    iconBg: 'bg-destructive/10',
    iconText: 'text-destructive',
  },
  info: {
    border: 'border-l-info',
    iconBg: 'bg-info/10',
    iconText: 'text-info',
  },
  neutral: {
    border: 'border-l-muted-foreground',
    iconBg: 'bg-muted',
    iconText: 'text-muted-foreground',
  },
  primary: {
    border: 'border-l-primary',
    iconBg: 'bg-primary/10',
    iconText: 'text-primary',
  },
};

export function KPICard({
  label,
  value,
  subtitle,
  icon: Icon,
  status = 'neutral',
  compact = false,
  loading = false,
  extra,
  className,
}: KPICardProps) {
  const styles = STATUS_STYLES[status] ?? STATUS_STYLES.neutral;

  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-col justify-between bg-card/90 backdrop-blur-md rounded-xl',
          'border border-border/70 hover:border-primary/40 hover:shadow-md',
          'transition-all duration-200',
          compact ? 'p-3 sm:p-3.5' : 'p-4 sm:p-5',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground line-clamp-1">
            {label}
          </span>
          {Icon && (
            <div className={cn('p-1.5 rounded-lg border shrink-0', styles.iconBg, styles.iconText)}>
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
        <div>
          <p className={cn('text-xl sm:text-2xl font-black leading-none tracking-tight', styles.iconText)}>
            {loading ? '…' : typeof value === 'number' ? value.toLocaleString('es-CO') : value}
          </p>
          {subtitle && (
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-1 line-clamp-1">
              {subtitle}
            </p>
          )}
          {extra}
        </div>
      </div>
    );
  }

  return (
    <Card
      hoverable={false}
      className={cn(
        'border-l-4 bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden',
        styles.border,
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-5 sm:pb-1">
        <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardDescription>
        {Icon && (
          <div className={cn('p-2 rounded-lg', styles.iconBg, styles.iconText)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
        <div className="flex items-baseline gap-2">
          <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
            {loading ? '…' : typeof value === 'number' ? value.toLocaleString('es-CO') : value}
          </CardTitle>
          {extra}
        </div>
        {subtitle && (
          <p className="text-[11px] font-semibold text-muted-foreground mt-1">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default KPICard;
