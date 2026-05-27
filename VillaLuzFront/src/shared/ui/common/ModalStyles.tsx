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
};

/**
 * Componente para el título de una sección
 */
export const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className={modalStyles.sectionTitle}>
    <div className={modalStyles.sectionIndicator}></div>
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
}> = ({ children, title, className = '' }) => (
  <div className={`${modalStyles.card.base} ${className}`}>
    {title && <SectionTitle>{title}</SectionTitle>}
    {children}
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
