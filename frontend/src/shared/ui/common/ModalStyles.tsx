/**
 * Componentes y utilidades para estilos consistentes en modales
 *
 * Este archivo proporciona componentes reutilizables y clases de utilidad
 * para mantener un diseño uniforme en todos los modales de la aplicación.
 * Incluye soporte responsive para asegurar legibilidad en todos los dispositivos.
 */

import React from 'react';

/**
 * Clases de estilo comunes para modales con soporte responsive.
 *
 * Reglas de legibilidad:
 * - Móvil (<768px): text-sm mínimo, padding reducido
 * - Tablet (768-1023px): text-sm, padding medio
 * - Desktop (>=1024px): text-sm/text-base, padding generoso
 */
// eslint-disable-next-line react-refresh/only-export-components
export const modalStyles = {
  // Espaciado
  spacing: {
    section: 'space-y-2 sm:space-y-3 lg:space-y-4',
    sectionLarge: 'space-y-3 sm:space-y-4 lg:space-y-5',
    sectionSmall: 'space-y-1.5 sm:space-y-2',
    grid: 'gap-2 sm:gap-3',
    gridLarge: 'gap-3 sm:gap-4 lg:gap-5',
  },

  // Tarjetas
  card: {
    base: 'bg-[color-mix(in_srgb,hsl(var(--card))_80%,transparent)] border border-[color-mix(in_srgb,hsl(var(--border))_60%,transparent)] rounded-xl p-2.5 sm:p-3 shadow-sm shadow-black/10 backdrop-blur-sm',
    hover: 'bg-[color-mix(in_srgb,hsl(var(--card))_84%,transparent)] border border-[color-mix(in_srgb,hsl(var(--border))_60%,transparent)] rounded-xl p-2.5 sm:p-3 shadow-sm shadow-black/10 backdrop-blur-sm hover:shadow-md hover:shadow-black/15 transition-shadow',
  },

  // Títulos de sección
  sectionTitle: 'text-xs sm:text-sm font-semibold text-foreground mb-2 sm:mb-2.5 flex items-center gap-1.5',

  // Indicador decorativo
  sectionIndicator: 'w-1 h-3 sm:h-3.5 bg-foreground/20 rounded-full',

  // Labels de campos
  fieldLabel: 'text-[11px] sm:text-xs text-foreground/70 mb-1 sm:mb-1.5 font-medium',

  // Valores de campos
  fieldValue: {
    normal: 'text-xs sm:text-sm font-medium text-foreground min-h-[1.25rem]',
    large: 'text-sm sm:text-base md:text-lg font-semibold text-foreground',
    xlarge: 'text-base sm:text-lg md:text-xl font-bold text-foreground',
  },

  // Grid de dos columnas responsive
  twoColGrid: 'grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 items-start min-w-0',

  // Grid interno de campos
  fieldsGrid: 'grid grid-cols-2 gap-2 sm:gap-3',

  // Tabla en modal
  tableContainer: 'overflow-x-auto -mx-1 sm:-mx-0 rounded-lg border border-border/30',

  // Pie de modal
  footer: 'flex flex-col gap-2 border-t border-border/40 pt-3 sm:flex-row sm:items-center sm:justify-between',
  footerInfo: 'text-[11px] sm:text-xs text-foreground/60',
};

/**
 * Componente para el título de una sección
 */
export const SectionTitle: React.FC<{
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ children, icon }) => (
  <h3 className={modalStyles.sectionTitle}>
    {icon ?? <div className={modalStyles.sectionIndicator}></div>}
    {children}
  </h3>
);

/**
 * Componente para una tarjeta de sección
 */
export const SectionCard: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
  variant?: 'base' | 'hover' | 'muted';
}> = ({ children, title, className = '', variant = 'base' }) => {
  const base = variant === 'hover' ? modalStyles.card.hover : modalStyles.card.base;
  const muted = variant === 'muted' ? ' bg-muted/20' : '';
  return (
    <div className={`${base}${muted} ${className}`}>
      {title && <SectionTitle>{title}</SectionTitle>}
      {children}
    </div>
  );
};

/**
 * Fila de progreso: etiqueta, conteo y barra proporcional al total.
 */
export const ProgressRow: React.FC<{
  label: string;
  count: number;
  total: number;
  variant?: 'success' | 'info' | 'danger' | 'warning';
}> = ({ label, count, total, variant = 'info' }) => {
  const pct = total > 0 ? Math.min(100, Math.round((count / total) * 100)) : 0;
  const barColor = {
    success: 'bg-emerald-500',
    info: 'bg-sky-500',
    danger: 'bg-rose-500',
    warning: 'bg-amber-500',
  }[variant];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] sm:text-xs text-foreground/80">
        <span>{label}</span>
        <span className="font-semibold text-foreground">{count}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/**
 * Tarjeta compacta de métrica con icono.
 */
export const StatCard: React.FC<{
  icon: React.ReactNode;
  value: React.ReactNode;
  label: string;
  accent?: 'blue' | 'emerald' | 'amber' | 'rose';
}> = ({ icon, value, label, accent = 'blue' }) => {
  const accentColor = {
    blue: 'text-sky-500',
    emerald: 'text-emerald-500',
    amber: 'text-amber-500',
    rose: 'text-rose-500',
  }[accent];

  return (
    <div className={`${modalStyles.card.base} flex flex-col items-center gap-1 text-center`}>
      <span className={accentColor}>{icon}</span>
      <span className={modalStyles.fieldValue.large}>{value}</span>
      <span className={modalStyles.fieldLabel}>{label}</span>
    </div>
  );
};

/**
 * Estado de carga estándar dentro de un modal.
 */
export const ModalLoadingState: React.FC<{ message?: string }> = ({
  message = 'Cargando...',
}) => (
  <div className="flex flex-col items-center justify-center gap-2 py-8 text-foreground/70">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground/70" />
    <p className="text-xs sm:text-sm">{message}</p>
  </div>
);

/**
 * Componente para un campo de información
 */
export const InfoField: React.FC<{
  label: string;
  value: React.ReactNode;
  valueSize?: 'normal' | 'large' | 'xlarge';
  className?: string;
}> = ({ label, value, valueSize = 'normal', className = '' }) => (
  <div className={className}>
    <div className={modalStyles.fieldLabel}>{label}</div>
    <div className={modalStyles.fieldValue[valueSize]}>{value}</div>
  </div>
);

/**
 * Componente para el contenedor principal de dos columnas
 */
export const TwoColumnLayout: React.FC<{
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}> = ({ left, right, className = '' }) => (
  <div className={`${modalStyles.twoColGrid} ${className}`}>
    <div className={modalStyles.spacing.section}>{left}</div>
    <div className={modalStyles.spacing.section}>{right}</div>
  </div>
);
