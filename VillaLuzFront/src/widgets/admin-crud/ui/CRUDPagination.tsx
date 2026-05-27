/*
 * CRUDPagination
 * 
 * Componente optimizado para la paginación de tablas.
 * Implementa navegación eficiente, accesible y con diseño inmersivo flotante.
 */

import React, { memo, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
}

export const CRUDPagination = memo<CRUDPaginationProps>(({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
  loading = false,
  hasSelection = false,
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
      "fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-500 ease-out max-w-[95vw] pointer-events-auto",
      hasSelection 
        ? "bottom-20 sm:bottom-24 scale-95 opacity-55 hover:scale-100 hover:opacity-100 focus-within:opacity-100 shadow-xl" 
        : "bottom-4 scale-100 opacity-50 hover:opacity-100 focus-within:opacity-100 shadow-xl",
      "bg-slate-900/70 dark:bg-slate-900/80 text-white backdrop-blur-xl border border-white/10 ring-1 ring-white/10 rounded-lg"
    )}>
      <div className="px-3 py-1.5 sm:px-4 sm:py-2">
        <div className="flex justify-between items-center text-[11px] sm:text-xs gap-2 sm:gap-3">
          {/* Información de paginación */}
          <div className="text-white/80 font-medium flex items-center shrink-0">
            <span>{t('common.page', 'Página').slice(0, 3)}. </span>
            <span className="mx-1 text-white font-bold">{currentPage}</span>
            <span className="text-white/60">/</span>
            <span className="mx-1 text-white font-bold">{Math.max(totalPages, 1)}</span>
            <span className="ml-2 hidden md:inline text-[11px] text-white/65">
              ({totalItems} {totalItems === 1 ? 'registro' : 'registros'})
            </span>
          </div>
          
          {/* Controles de paginación */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            {/* Botón anterior */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={loading || currentPage <= 1}
              aria-label={t('common.previous', 'Anterior')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-white hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>
            
            {/* Números de página */}
            <div className="hidden sm:flex items-center gap-1">
              {visiblePages.map((page, index) => (
                <React.Fragment key={index}>
                  {page === '...' ? (
                    <span className="px-1.5 py-1 text-white/50">...</span>
                  ) : (
                    <Button
                      variant={currentPage === page ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(page as number)}
                      disabled={loading}
                      className={cn(
                        "h-7 w-7 sm:h-8 sm:w-8 text-xs font-bold transition-all",
                        currentPage === page 
                          ? "bg-primary text-white shadow-md shadow-primary/25" 
                          : "text-white/80 hover:bg-white/10 hover:text-white"
                      )}
                    >
                      {page}
                    </Button>
                  )}
                </React.Fragment>
              ))}
            </div>
            
            {/* Paginación simplificada para móviles */}
            <div className="sm:hidden text-xs text-white/70 font-bold">
              {currentPage} / {totalPages}
            </div>
            
            {/* Botón siguiente */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={loading || currentPage >= totalPages}
              aria-label={t('common.next', 'Siguiente')}
              className="inline-flex items-center justify-center h-7 w-7 sm:h-8 sm:w-8 text-sm font-medium text-white hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

CRUDPagination.displayName = 'CRUDPagination';

export default CRUDPagination;
