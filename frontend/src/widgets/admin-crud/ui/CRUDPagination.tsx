/*
 * CRUDPagination
 *
 * Componente optimizado para la paginación de tablas.
 * Implementa navegación eficiente, accesible y con diseño inmersivo flotante.
 */

import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn.ts';
import { useT } from '@/shared/i18n';

interface CRUDPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  loading?: boolean;
  hasSelection?: boolean;
  /** Mantiene la variante flotante para tablas; las tarjetas pueden reservar su propio espacio. */
  floating?: boolean;
  /** Registros por página actual. Solo se muestra el selector si además llega `pageSizeOptions`. */
  pageSize?: number;
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
}

export const CRUDPagination = memo<CRUDPaginationProps>(({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  loading = false,
  hasSelection = false,
  floating = true,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}) => {
  const t = useT();

  // Manejar cambio de página
  const handlePageChange = useCallback((page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage && !loading) {
      onPageChange(page);
    }
  }, [currentPage, totalPages, loading, onPageChange]);

  // Generar array de páginas a mostrar
  const getVisiblePages = useCallback(() => {
    const delta = 1; // Mantiene la barra compacta en tablas grandes

    // Caso especial: menos de 7 páginas totales
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Caso normal: mostrar páginas alrededor de la actual
    const range: number[] = [];
    const rangeWithDots: (number | string)[] = [];
    let l: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 || // Primera página
        i === totalPages || // Última página
        (i >= currentPage - delta && i <= currentPage + delta) // Páginas alrededor de la actual
      ) {
        range.push(i);
      }
    }

    // Agregar puntos suspensivos donde haya saltos
    range.forEach((i) => {
      if (l !== undefined) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    });

    return rangeWithDots;
  }, [currentPage, totalPages]);

  const visiblePages = getVisiblePages();

  /*
   * Variante flotante: la barra sale del flujo para no robarle ~65 px de alto a
   * la tabla. Se centra sobre el ÁREA DE CONTENIDO, no sobre el viewport, de ahí
   * `--app-content-left` (el ancho que reserva el menú lateral, publicado por
   * DashboardLayout). `--app-floating-*` la apaga mientras el cajón del menú
   * cubre la pantalla en móvil.
   *
   * `bottom-7` deja libre la franja inferior donde flota la barra de
   * desplazamiento horizontal de la tabla. Si se baja, la tapa.
   */
  const bar = (
    <div className={cn(
      "pointer-events-auto w-fit max-w-full transition-all duration-300 ease-out",
      floating
        ? "opacity-90 hover:opacity-100 focus-within:opacity-100 shadow-xl hover:shadow-2xl"
        : "scale-100 opacity-100 shadow-sm",
      "bg-slate-900/90 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-white/15 dark:border-white/10 hover:border-white/25 rounded-full px-1.5 sm:px-2.5 py-0.5"
    )}>
      <div className="px-1 py-0.5 sm:px-2 sm:py-0.5">
        <div className="flex justify-between items-center text-[11px] sm:text-xs gap-1.5 sm:gap-2.5">
          {/* Información de paginación con badge compacto */}
          <div className="font-medium flex items-center shrink-0">
            <span className="whitespace-nowrap px-2 py-0.5 rounded-full bg-primary/20 text-white font-bold text-[11px] sm:text-xs border border-primary/30">
              Pág. {currentPage} / {Math.max(totalPages, 1)}
            </span>
            <span className="ml-1.5 hidden md:inline text-[11px] sm:text-[11px] text-white/70 font-medium">
              ({totalItems} {totalItems === 1 ? 'reg.' : 'registros'})
            </span>
          </div>

          {/* Controles de paginación */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Primera página */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(1)}
              disabled={loading || currentPage <= 1}
              aria-label={t('common.first', 'Primera')}
              title={t('common.first', 'Primera')}
              className="hidden sm:inline-flex items-center justify-center h-7 w-7 p-0 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronsLeft className="h-3.5 w-3.5" aria-hidden />
            </Button>

            {/* Botón anterior */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              aria-label={t('common.previous', 'Anterior')}
              className="inline-flex items-center justify-center h-8 w-8 sm:h-7 sm:w-7 p-0 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
            </Button>

            {/* Números de página */}
            <div className="hidden sm:flex items-center gap-0.5">
              {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-1 text-white/50 text-[11px]">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      disabled={loading}
                      className={cn(
                        "h-7 w-7 p-0 text-[11px] font-bold rounded-full transition-all",
                        currentPage === page
                          ? "bg-primary text-white shadow-sm scale-105"
                          : "text-white/80 hover:bg-white/15 hover:text-white"
                      )}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Paginación simplificada para móviles. `whitespace-nowrap`: a 320 px
                el flex comprimía la caja y "1 / 1" se partía en tres renglones. */}
            <div className="sm:hidden whitespace-nowrap text-xs text-white/90 font-bold px-2 py-1">
              {currentPage} / {totalPages}
            </div>

            {/* Botón siguiente */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.next', 'Siguiente')}
              className="inline-flex items-center justify-center h-8 w-8 sm:h-7 sm:w-7 p-0 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden />
            </Button>

            {/* Última página */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.last', 'Última')}
              title={t('common.last', 'Última')}
              className="hidden sm:inline-flex items-center justify-center h-7 w-7 p-0 text-xs font-medium text-white/80 hover:bg-white/15 hover:text-white rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronsRight className="h-3.5 w-3.5" aria-hidden />
            </Button>

            {/* Selector de registros por página */}
            {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
              <>
                <span className="mx-1 hidden h-3.5 w-px bg-white/20 sm:block" aria-hidden />
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  disabled={loading}
                  aria-label="Registros por página"
                  title="Registros por página"
                  className="hidden sm:block h-6 sm:h-7 rounded-full border border-white/20 bg-slate-800/90 px-2 text-[11px] sm:text-[11px] font-bold text-white outline-none transition-colors hover:bg-slate-700/90 focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-30"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size} className="bg-slate-900 text-white">
                      {size >= 1000 ? `${size} (Ver todos)` : `${size} / pág.`}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (!floating) {
    return <div className="relative z-20 mx-auto my-1.5 flex w-full shrink-0 justify-center">{bar}</div>;
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[100] flex -translate-x-1/2 justify-center px-2',
        hasSelection ? 'bottom-16 sm:bottom-[4.5rem]' : 'bottom-7 sm:bottom-8',
      )}
      style={{
        left: 'calc(50% + var(--app-content-left, 0px) / 2)',
        maxWidth: 'calc(100vw - var(--app-content-left, 0px) - 1rem)',
        opacity: 'var(--app-floating-opacity, 1)',
      }}
    >
      {/* El envoltorio no intercepta el mouse (las filas de debajo siguen siendo
          clicables); solo la píldora lo hace, y se apaga con el cajón abierto. */}
      <div
        className="w-fit max-w-full"
        style={{ pointerEvents: 'var(--app-floating-events, auto)' as React.CSSProperties['pointerEvents'] }}
      >
        {bar}
      </div>
    </div>
  );
});

CRUDPagination.displayName = 'CRUDPagination';

export default CRUDPagination;
