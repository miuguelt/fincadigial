import React from 'react';
import { cn } from '@/shared/ui/cn';
import { ModuleHeading } from '@/widgets/layout/ModuleHeading';

/**
 * Encabezado estándar de una pantalla de datos (tabla o tarjetas).
 *
 * Regla de la casa: en una pantalla de datos manda la información, no el
 * encabezado. Por eso este bloque es deliberadamente bajo (~64 px el bloque
 * de título) y las métricas usan `<KPICard compact />`, sin sparkline.
 *
 * Va montado dentro del área con scroll de `AdminCRUDPage` (`headerSlot`), así
 * que se desplaza junto con las filas y la tabla puede llegar a ocupar todo el
 * alto disponible. En "Pantalla Completa" no se monta.
 *
 * Ver `docs/estandar-pantallas-de-datos.md`.
 *
 * @example
 * ```tsx
 * <DataScreenHeader
 *   icon={<HeartPulse className="h-5 w-5 text-white" />}
 *   iconClassName="from-purple-500 to-purple-600 shadow-purple-500/20"
 *   title={<>Salud y <span className="text-purple-500">Tratamientos</span></>}
 *   description="Monitoreo clínico, insumos aplicados y control de salud"
 *   metrics={<><KPICard compact title="Total" value={10} icon="📋" /></>}
 * >
 *   <SanidadTabs />
 * </DataScreenHeader>
 * ```
 */
export interface DataScreenHeaderProps {
  /** Título de la pantalla. Admite un `<span>` interno con el color de acento. */
  title: React.ReactNode;
  /** Subtítulo de una línea. */
  description?: React.ReactNode;
  /** Elemento previo al icono, normalmente el botón de volver. */
  leading?: React.ReactNode;
  /** Icono del bloque de título. */
  icon?: React.ReactNode;
  /** Color semántico para el contenedor del icono. */
  iconColor?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  /** Clases personalizadas para el cuadro del icono (soporte legacy). */
  iconClassName?: string;
  /** Insignias o botones alineados a la derecha del título. */
  actions?: React.ReactNode;
  /** Oculta la identidad del módulo cuando el CRUD ya la muestra junto al buscador. */
  showTitle?: boolean;
  /** Rejilla de métricas. Usa siempre `<KPICard compact />`. */
  metrics?: React.ReactNode;
  /** Columnas de la rejilla de métricas en pantallas grandes. */
  metricsColumns?: 3 | 4 | 5 | 6;
  /** Bloques adicionales bajo las métricas (pestañas, filtros activos…). */
  children?: React.ReactNode;
  className?: string;
}

const ICON_COLOR_MAP: Record<string, string> = {
  primary: 'from-primary to-primary/80 shadow-primary/20',
  success: 'from-success-500 to-success-600 shadow-success-500/20',
  warning: 'from-warning-500 to-warning-600 shadow-warning-500/20',
  danger: 'from-destructive to-destructive/80 shadow-destructive/20',
  info: 'from-info to-info/80 shadow-info/20',
  neutral: 'from-slate-600 to-slate-700 shadow-slate-600/20',
};

const METRIC_COLUMNS: Record<number, string> = {
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-5',
  6: 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6',
};

export const DataScreenHeader: React.FC<DataScreenHeaderProps> = ({
  title,
  description,
  leading,
  icon,
  iconColor,
  iconClassName,
  actions,
  showTitle = true,
  metrics,
  metricsColumns = 4,
  children,
  className,
}) => (
  <div className={cn('mb-3 sm:mb-4 space-y-2.5 sm:space-y-3.5', className)}>
    {(showTitle || leading || actions) && (
      <div className={cn(
        'flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card/40 backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border border-border/40 shadow-sm',
        !showTitle && 'lg:justify-end',
      )}>
        {showTitle || leading ? (
          <div className="flex items-center gap-4 min-w-0">
            {leading}
            {showTitle && (
              <ModuleHeading
                title={title}
                description={description}
                icon={icon}
                iconContainerClassName={iconColor ? ICON_COLOR_MAP[iconColor] : iconClassName}
              />
            )}
          </div>
        ) : null}
        {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
      </div>
    )}

    {metrics && (
      <div className={cn('grid gap-2 sm:gap-3', METRIC_COLUMNS[metricsColumns])}>
        {metrics}
      </div>
    )}

    {children}
  </div>
);

export default DataScreenHeader;
