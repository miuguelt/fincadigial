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
  
  return (
    <div className={cn(
      floating
        ? "fixed left-1/2 -translate-x-1/2 max-w-[95vw] z-[100]"
        : "relative z-20 mx-auto my-3 w-fit max-w-[calc(100%-1rem)] shrink-0",
      "pointer-events-auto transition-all duration-300 ease-out",
      floating
        ? hasSelection
          ? "bottom-14 sm:bottom-16 scale-90 sm:scale-95 opacity-65 hover:opacity-100 focus-within:opacity-100 shadow-md hover:shadow-xl"
          : "bottom-2 sm:bottom-3 scale-90 sm:scale-95 opacity-65 hover:opacity-100 focus-within:opacity-100 shadow-md hover:shadow-xl"
        : "scale-100 opacity-100 shadow-sm",
      "bg-card/50 dark:bg-slate-900/50 text-card-foreground dark:text-white/90 backdrop-blur-md border border-border/30 dark:border-white/10 hover:bg-card/90 dark:hover:bg-slate-900/90 hover:border-border/60 transition-all duration-300 rounded-full px-1 sm:px-2 py-0.5 sm:py-1"
    )}>
      <div className="px-2 py-0.5 sm:px-3 sm:py-1">
        <div className="flex justify-between items-center text-[11px] sm:text-xs gap-2 sm:gap-3">
          {/* Información de paginación con badge elegante */}
          <div className="font-medium flex items-center shrink-0">
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold text-[11px] sm:text-xs border border-primary/20">
              Pág. {currentPage} / {Math.max(totalPages, 1)}
            </span>
            <span className="ml-2 hidden md:inline text-[11px] text-muted-foreground font-medium">
              ({totalItems} {totalItems === 1 ? 'registro' : 'registros'})
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
              className="hidden sm:inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-foreground/80 hover:bg-muted dark:text-white/80 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronsLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>

            {/* Botón anterior */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              aria-label={t('common.previous', 'Anterior')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-foreground/80 hover:bg-muted dark:text-white/80 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>
            
            {/* Números de página */}
            <div className="hidden sm:flex items-center gap-1">
              {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-1.5 py-1 text-muted-foreground">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      disabled={loading}
                      className={cn(
                        "h-7 w-7 sm:h-8 sm:w-8 text-xs font-bold rounded-full transition-all",
                        currentPage === page 
                          ? "bg-primary text-white shadow-md shadow-primary/25 scale-105" 
                          : "text-foreground/80 hover:bg-muted dark:text-white/80 dark:hover:bg-white/10"
                      )}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Paginación simplificada para móviles */}
            <div className="sm:hidden text-xs text-muted-foreground font-bold px-1">
              {currentPage} / {totalPages}
            </div>
            
            {/* Botón siguiente */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.next', 'Siguiente')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-foreground/80 hover:bg-muted dark:text-white/80 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>

            {/* Última página */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(totalPages)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.last', 'Última')}
              title={t('common.last', 'Última')}
              className="hidden sm:inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-foreground/80 hover:bg-muted dark:text-white/80 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-30"
            >
              <ChevronsRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>

            {/* Selector de registros por página */}
            {pageSizeOptions && pageSizeOptions.length > 0 && onPageSizeChange && (
              <>
                <span className="mx-1 hidden h-4 w-px bg-border dark:bg-white/15 sm:block" aria-hidden />
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  disabled={loading}
                  aria-label="Registros por página"
                  title="Registros por página"
                  className="hidden sm:block h-7 sm:h-8 rounded-full border border-border bg-background dark:bg-slate-800 px-2 text-[11px] font-bold text-foreground dark:text-white outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/60 disabled:opacity-30"
                >
                  {pageSizeOptions.map((size) => (
                    <option key={size} value={size} className="bg-popover text-popover-foreground">
                      {size}
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
});

CRUDPagination.displayName = 'CRUDPagination';

export default CRUDPagination;
