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
            className="w-8 h-8 min-w-[32px] rounded-full text-sm text-foreground/70 hover:bg-card/10 hover:text-foreground transition-all duration-200 focus:outline-none"
            aria-label={`Ir a la página ${i}`}
          >
            {i}
          </button>
        );
      }
    }

    if (start > boundaryCount + 1) {
      numbers.push(
        <span key="start-ellipsis" aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
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
            'w-8 h-8 min-w-[32px] rounded-full text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring/50',
            i === page
              ? 'bg-primary text-primary-foreground shadow-sm scale-110'
              : 'text-foreground/70 hover:bg-card/10 hover:text-foreground'
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
        <span key="end-ellipsis" aria-hidden className="px-2 py-2 text-sm text-muted-foreground">
          ...
        </span>
      );
    }

    for (let i = Math.max(pages - boundaryCount + 1, end + 1); i <= pages; i++) {
      numbers.push(
        <button
          key={i}
          onClick={() => goTo(i)}
          className="w-8 h-8 min-w-[32px] rounded-full text-sm text-foreground/70 hover:bg-card/10 hover:text-foreground transition-all duration-200 focus:outline-none"
          aria-label={`Ir a la página ${i}`}
        >
          {i}
        </button>
      );
    }

    return <div className="flex items-center gap-1">{numbers}</div>;
  };

  const content = (
    <div className="bg-slate-900/75 dark:bg-slate-900/85 text-white backdrop-blur-xl border border-white/10 ring-1 ring-white/10 rounded-[2rem] px-5 py-3 shadow-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goTo(page - 1)}
            disabled={!canPrev}
            className="w-8 h-8 rounded-full text-foreground/60 hover:bg-card/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-sm"
            aria-label="Página anterior"
          >
            ‹
          </button>

          {makePageNumbers()}

          <button
            onClick={() => goTo(page + 1)}
            disabled={!canNext}
            className="w-8 h-8 rounded-full text-foreground/60 hover:bg-card/10 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center text-sm"
            aria-label="Página siguiente"
          >
            ›
          </button>
        </div>

        <div className="text-xs font-medium text-white/60 tracking-wide">
          Página <span className="text-white font-semibold">{page}</span> de <span className="text-white font-semibold">{Math.max(pages, 1)}</span>
        </div>
      </div>
    </div>
  );

  if (!fixedBottom) return content;

  return (
    <>
      {/* Spacer interno para reservar el alto de la barra fija en sm+ sin tocar el body */}
      <div className="hidden sm:block h-16" aria-hidden="true" />

      <div
        className={cn(
          'sm:fixed sm:bottom-0 sm:left-[var(--sidebar-width,0px)] sm:right-0 z-[9999] bg-background/70 dark:bg-background/60 backdrop-blur-xl border-t border-white/10 shadow-sm',
          containerClassName
        )}
      >
        <div className={cn('max-w-7xl mx-auto px-3 py-2.5 sm:px-6 sm:py-3', innerClassName)}>{content}</div>
      </div>
    </>
  );
};