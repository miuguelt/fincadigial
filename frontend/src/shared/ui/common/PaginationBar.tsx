import React from 'react';
import { cn } from '@/shared/ui/cn.ts';

export interface PaginationBarProps {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  // Compatibilidad retro: algunas páginas pasan estos props aunque no son necesarios para el render
  pageSize?: number;
  total?: number;
  showNumbers?: boolean;
  boundaryCount?: number;
  siblingCount?: number;
  fixedBottom?: boolean; // fijo en escritorio para que siempre sea visible
  containerClassName?: string;
  innerClassName?: string;
}

export const PaginationBar: React.FC<PaginationBarProps> = ({
  page,
  pages,
  onPageChange,
  pageSize: _pageSize, // no usado, mantenido por compatibilidad
  total: _total, // no usado, mantenido por compatibilidad
  showNumbers = true,
  boundaryCount = 1,
  siblingCount = 1,
  fixedBottom = true,
  containerClassName,
  innerClassName,
}) => {
  const canPrev = page > 1;
  const canNext = page < pages;

  const goTo = (p: number) => {
    if (p >= 1 && p <= pages && p !== page) onPageChange(p);
  };

  // Render de números de página
  const makePageNumbers = () => {
    if (!showNumbers) return null;

    const start = Math.max(1, page - siblingCount);
    const end = Math.min(pages, page + siblingCount);

    const numbers: React.ReactNode[] = [];

    // Primeros límites
    for (let i = 1; i <= Math.min(boundaryCount, pages); i++) {
      if (i < start) {
        numbers.push(
          <button
            key={i}
            onClick={() => goTo(i)}
            className="w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] sm:min-w-[28px] rounded-full text-xs text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200 focus:outline-none"
            aria-label={`Ir a la página ${i}`}
          >
            {i}
          </button>
        );
      }
    }

    if (start > boundaryCount + 1) {
      numbers.push(
        <span key="start-ellipsis" aria-hidden className="px-1 text-xs text-white/50">
          ...
        </span>
      );
    }

    for (let i = start; i <= end; i++) {
      numbers.push(
        <button
          key={i}
          onClick={() => goTo(i)}
          className={cn(
            'w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] sm:min-w-[28px] rounded-full text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/50',
            i === page
              ? 'bg-primary text-white shadow-sm scale-105 font-bold'
              : 'text-white/80 hover:bg-white/15 hover:text-white'
          )}
          aria-current={i === page ? 'page' : undefined}
          aria-label={`Ir a la página ${i}`}
        >
          {i}
        </button>
      );
    }

    if (end < pages - boundaryCount) {
      numbers.push(
        <span key="end-ellipsis" aria-hidden className="px-1 text-xs text-white/50">
          ...
        </span>
      );
    }

    for (let i = Math.max(pages - boundaryCount + 1, end + 1); i <= pages; i++) {
      numbers.push(
        <button
          key={i}
          onClick={() => goTo(i)}
          className="w-6 h-6 sm:w-7 sm:h-7 min-w-[24px] sm:min-w-[28px] rounded-full text-xs text-white/80 hover:bg-white/15 hover:text-white transition-all duration-200 focus:outline-none"
          aria-label={`Ir a la página ${i}`}
        >
          {i}
        </button>
      );
    }

    return <div className="flex items-center gap-0.5">{numbers}</div>;
  };

  const content = (
    <div className="bg-slate-900/90 dark:bg-slate-900/95 text-white backdrop-blur-xl border border-white/15 rounded-full px-2.5 py-1 shadow-xl">
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(page - 1)}
            disabled={!canPrev}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-xs"
            aria-label="Página anterior"
          >
            ‹
          </button>

          {makePageNumbers()}

          <button
            onClick={() => goTo(page + 1)}
            disabled={!canNext}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full text-white/70 hover:bg-white/15 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-xs"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="text-[11px] sm:text-xs font-medium text-white/70 tracking-wide shrink-0">
          Pág. <span className="text-white font-bold">{page}</span> / <span className="text-white font-bold">{Math.max(pages, 1)}</span>
        </div>
      </div>
    </div>
  );

  if (!fixedBottom) return content;

  return (
    <div
      className={cn(
        'fixed bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 z-[100] max-w-[95vw] opacity-90 hover:opacity-100 transition-all duration-300 pointer-events-auto',
        containerClassName
      )}
    >
      <div className={cn('w-auto', innerClassName)}>{content}</div>
    </div>
  );
};
