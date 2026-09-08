import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Check, ListChecks, ChevronRight } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
import { cn } from '@/shared/ui/cn';
import { SmartFilter, SMART_FILTERS, FILTER_ACCENTS } from './smartFilters.data';

export interface SmartFiltersToolbarProps {
  activeFilters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  className?: string;
}

const chipBase =
  'h-8 shrink-0 snap-start rounded-full border px-3 text-xs font-semibold gap-1.5 transition-all duration-200 active:scale-95 whitespace-nowrap shadow-none';

export function SmartFiltersToolbar({
  activeFilters: propActiveFilters,
  onFilterChange: propOnFilterChange,
  className = '',
}: SmartFiltersToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);

  const activeFilters = useMemo(() => {
    if (propActiveFilters) return propActiveFilters;
    const filters: Record<string, any> = {};
    SMART_FILTERS.forEach((f) => {
      const val = searchParams.get(f.queryParam);
      if (val !== null) filters[f.queryParam] = val;
    });
    return filters;
  }, [propActiveFilters, searchParams]);

  const activeCount = SMART_FILTERS.filter(
    (f) => activeFilters[f.queryParam] === f.value
  ).length;

  const toggleFilter = (filter: SmartFilter) => {
    if (propOnFilterChange) {
      const newFilters = { ...activeFilters };
      if (newFilters[filter.queryParam] === filter.value) {
        delete newFilters[filter.queryParam];
      } else {
        newFilters[filter.queryParam] = filter.value;
      }
      propOnFilterChange(newFilters);
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    if (nextParams.get(filter.queryParam) === filter.value) {
      nextParams.delete(filter.queryParam);
    } else {
      nextParams.set(filter.queryParam, filter.value);
    }
    nextParams.set('page', '1');
    setSearchParams(nextParams, { replace: true });
  };

  const clearFilters = () => {
    if (propOnFilterChange) {
      const newFilters = { ...activeFilters };
      SMART_FILTERS.forEach((f) => {
        delete newFilters[f.queryParam];
      });
      propOnFilterChange(newFilters);
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    SMART_FILTERS.forEach((f) => {
      nextParams.delete(f.queryParam);
    });
    nextParams.set('page', '1');
    setSearchParams(nextParams, { replace: true });
  };

  const hasActive = activeCount > 0;

  return (
    <>
      <div
        className={cn('flex w-full min-w-0 items-center gap-2', className)}
        role="toolbar"
        aria-label="Filtros del inventario"
      >
        {/* ═══════ Desktop (md+): chips inline ═══════ */}
        <div className="hidden md:flex min-w-0 flex-1 items-center gap-2">
          <div className="flex shrink-0 items-center gap-1.5 border-r border-border/60 pr-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Filtros
            </span>
            {hasActive && (
              <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {SMART_FILTERS.map((filter) => {
              const isActive = activeFilters[filter.queryParam] === filter.value;
              const Icon = filter.icon;
              return (
                <Button
                  key={filter.id}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleFilter(filter)}
                  title={filter.tooltip}
                  aria-pressed={isActive}
                  className={cn(
                    chipBase,
                    isActive ? filter.activeColorClass : filter.colorClass
                  )}
                >
                  <Icon
                    className={cn('h-3.5 w-3.5 shrink-0', isActive && 'stroke-[2.5]')}
                  />
                  {filter.label}
                  {isActive && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                      aria-hidden="true"
                    />
                  )}
                </Button>
              );
            })}

            {hasActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className={cn(
                  chipBase,
                  'border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                )}
                title="Quitar todos los filtros"
              >
                <X className="h-3.5 w-3.5 shrink-0" />
                Limpiar
              </Button>
            )}
          </div>
        </div>

        {/* ═══════ Mobile: un solo botón → hoja inferior ═══════ */}
        <div className="flex md:hidden w-full min-w-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSheetOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
            className={cn(
              'h-9 flex-1 justify-between rounded-xl border-border/60 bg-card/60 px-3 text-xs font-bold shadow-sm',
              hasActive && 'border-primary/50'
            )}
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-primary" />
              Filtros
            </span>
            {hasActive ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-primary-foreground">
                {activeCount}
              </span>
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>

          {hasActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-9 shrink-0 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60"
              title="Quitar todos los filtros"
              aria-label="Quitar todos los filtros"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Hoja inferior de filtros (móvil) / modal centrado (sm+) */}
      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent
          aria-label="Filtros del inventario"
          className={cn(
            // Móvil: hoja anclada al borde inferior, ancho completo
            'bottom-0 left-0 right-0 top-auto translate-x-0 translate-y-0',
            'w-full max-w-full rounded-none rounded-t-3xl',
            'data-[state=open]:slide-in-from-left-0',
            'data-[state=open]:slide-in-from-top-0',
            'data-[state=open]:slide-in-from-bottom-8',
            'data-[state=closed]:slide-out-to-left-0',
            'data-[state=closed]:slide-out-to-top-0',
            'data-[state=closed]:slide-out-to-bottom-8',
            // Pantallas medianas+: modal centrado clásico
            'sm:bottom-auto sm:left-1/2 sm:right-auto sm:top-1/2',
            'sm:w-auto sm:min-w-[420px] sm:max-w-lg md:max-w-lg lg:max-w-lg',
            'sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl'
          )}
        >
          <div className="flex h-full max-h-[85dvh] flex-col overflow-hidden sm:max-h-[80dvh]">
            {/* Encabezado */}
            <div className="border-b border-border/60 px-5 py-4 pr-14">
              <DialogTitle className="flex items-center gap-2 text-base font-bold">
                <ListChecks className="h-4 w-4 text-primary" />
                Filtros del inventario
                {hasActive && (
                  <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold leading-none text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {hasActive
                  ? 'Toca un filtro para quitarlo o limpia todo.'
                  : 'Toca un filtro para aplicarlo al instante.'}
              </DialogDescription>
            </div>

            {/* Opciones */}
            <div className="flex-1 space-y-1.5 overflow-y-auto px-4 py-3">
              {SMART_FILTERS.map((filter) => {
                const isActive = activeFilters[filter.queryParam] === filter.value;
                const Icon = filter.icon;
                const accent = FILTER_ACCENTS[filter.id];
                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => toggleFilter(filter)}
                    aria-pressed={isActive}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-150 active:scale-[0.98]',
                      isActive
                        ? 'border-primary/40 bg-primary/5 shadow-sm'
                        : 'border-border/50 bg-card/40 hover:bg-muted/50'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                        isActive ? accent : 'bg-muted/60 text-muted-foreground'
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px]', isActive && 'stroke-[2.5]')} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-foreground">
                        {filter.label}
                      </span>
                      <span className="block min-w-0 fit-clamp text-xs text-muted-foreground">
                        {filter.description}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors',
                        isActive
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border/70 text-transparent'
                      )}
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Pie: limpiar + ver resultados */}
            <div className="flex items-center gap-2 border-t border-border/60 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {hasActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="h-10 shrink-0 rounded-xl px-3 text-xs font-bold text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  Limpiar todo
                </Button>
              )}
              <Button
                size="sm"
                className="h-10 flex-1 rounded-xl text-xs font-bold"
                onClick={() => setSheetOpen(false)}
              >
                {hasActive ? (
                  <>
                    Ver {activeCount} filtro{activeCount === 1 ? '' : 's'} activo
                    {activeCount === 1 ? '' : 's'}
                  </>
                ) : (
                  'Ver todos los animales'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SmartFiltersToolbar;
