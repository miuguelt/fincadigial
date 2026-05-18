import React from 'react';
import { useMediaQuery } from '@/shared/hooks/useMediaQuery';

export interface SkeletonTableProps {
  columnLabels: string[];
  columnWidths?: Array<number | undefined>;
  rows?: number;
}

/**
 * SkeletonCard: esqueleto individual para la vista mobile.
 * Simula una card con título, badge, y pares key:value.
 */
const SkeletonCard: React.FC = () => (
  <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3 animate-pulse">
    {/* Título + badge */}
    <div className="flex items-start justify-between gap-2">
      <div className="h-4 w-2/3 rounded bg-muted/50" />
      <div className="h-5 w-16 rounded-full bg-muted/40" />
    </div>
    {/* Pares key:value */}
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="space-y-1">
          <div className="h-2.5 w-12 rounded bg-muted/30" />
          <div className="h-3.5 rounded bg-muted/40" style={{ width: `${Math.floor(Math.random() * 40 + 50)}%` }} />
        </div>
      ))}
    </div>
    {/* Acciones */}
    <div className="flex gap-2 pt-2 border-t border-border/30">
      <div className="h-10 flex-1 rounded-xl bg-muted/30" />
      <div className="h-10 w-10 rounded-xl bg-muted/30" />
    </div>
  </div>
);

/**
 * SkeletonTable: muestra un esqueleto de tabla accesible mientras se cargan los datos.
 * 
 * ── RESPONSIVE ──
 * - Móvil (<768px): muestra cards skeleton apiladas
 * - Tablet/Desktop (≥768px): muestra tabla skeleton con shimmer
 */
export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  columnLabels,
  columnWidths = [],
  rows = 8,
}) => {
  const isMobile = useMediaQuery('(max-width: 767px)');

  // ── Mobile: skeleton cards ──
  if (isMobile) {
    return (
      <div className="p-3 space-y-3" role="status" aria-label="Cargando datos...">
        {Array.from({ length: Math.min(rows, 5) }).map((_, i) => (
          <SkeletonCard key={`sk-card-${i}`} />
        ))}
        <span className="sr-only">Cargando datos...</span>
      </div>
    );
  }

  // ── Desktop/Tablet: tabla skeleton ──
  const headCells = columnLabels.map((label, idx) => {
    const w = columnWidths[idx];
    return (
      <th
        key={`sk-head-${idx}`}
        className={[
          'px-2 py-1 text-left text-[11px] md:text-xs font-medium text-muted-foreground uppercase tracking-wider',
          w ? `w-${w}` : '',
        ].join(' ')}
        aria-hidden="true"
      >
        {label}
      </th>
    );
  });

  const bodyRows = Array.from({ length: rows }).map((_, rIdx) => (
    <tr key={`sk-row-${rIdx}`} className="h-8 md:h-9">
      {columnLabels.map((_, cIdx) => {
        const w = columnWidths[cIdx];
        return (
          <td
            key={`sk-cell-${rIdx}-${cIdx}`}
            className={[
              'px-2 py-1 whitespace-nowrap text-[11px] md:text-xs',
              w ? `w-${w}` : '',
            ].join(' ')}
          >
            {/* Contenedor del skeleton con efecto shimmer mejorado */}
            <div
              className="h-4 w-full rounded relative overflow-hidden bg-muted/40"
              style={{ maxWidth: Math.floor(Math.random() * (100 - 60) + 60) + '%' }}
            >
              <div className="absolute inset-0 animate-shimmer" />
            </div>
          </td>
        );
      })}
    </tr>
  ));

  return (
    <div className="overflow-x-auto overflow-y-hidden" role="status" aria-label="Cargando datos...">
      <table className="min-w-full divide-y divide-border/70 text-[12px] md:text-sm">
        <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm supports-[backdrop-filter]:bg-muted/50">
          <tr className="h-8">{headCells}</tr>
        </thead>
        <tbody className="divide-y divide-border/60 bg-card">{bodyRows}</tbody>
      </table>
      <span className="sr-only">Cargando datos...</span>
    </div>
  );
};

export default SkeletonTable;