import React from 'react';
import { cn } from '@/shared/ui/cn';
import { FitText } from '@/shared/ui/FitText';

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
  /** Icono del bloque de título (tamaño sugerido: `h-5 w-5 text-white`). */
  icon?: React.ReactNode;
  /** Gradiente y sombra del cuadro del icono. */
  iconClassName?: string;
  /** Insignias o botones alineados a la derecha del título. */
  actions?: React.ReactNode;
  /** Rejilla de métricas. Usa siempre `<KPICard compact />`. */
  metrics?: React.ReactNode;
  /** Columnas de la rejilla de métricas en pantallas grandes. */
  metricsColumns?: 3 | 4 | 5 | 6;
  /** Bloques adicionales bajo las métricas (pestañas, filtros activos…). */
  children?: React.ReactNode;
  className?: string;
}

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
  iconClassName,
  actions,
  metrics,
  metricsColumns = 4,
  children,
  className,
}) => (
  <div className={cn('mb-3 sm:mb-4 space-y-2.5 sm:space-y-3.5', className)}>
    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card/40 backdrop-blur-xl px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl border border-border/40 shadow-sm">
      <div className="flex items-center gap-4 min-w-0">
        {leading}
        {icon && (
          <div className={cn(
            'h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg shrink-0',
            iconClassName ?? 'from-primary to-primary-600 shadow-primary/20',
          )}>
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <FitText as="h1" minScale={0.7} className="text-lg sm:text-xl font-black tracking-tight text-foreground">
            {title}
          </FitText>
          {description && (
            <FitText as="p" minScale={0.8} className="text-xs text-muted-foreground font-medium">
              {description}
            </FitText>
          )}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>

    {metrics && (
      <div className={cn('grid gap-2 sm:gap-3', METRIC_COLUMNS[metricsColumns])}>
        {metrics}
      </div>
    )}

    {children}
  </div>
);

export default DataScreenHeader;
