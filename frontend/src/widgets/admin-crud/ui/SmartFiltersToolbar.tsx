import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Milk, Baby, Scissors, TrendingDown, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';

export interface SmartFilter {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  activeColorClass: string;
  queryParam: string;
  value: any;
  tooltip: string;
}

export interface SmartFiltersToolbarProps {
  activeFilters?: Record<string, any>;
  onFilterChange?: (filters: Record<string, any>) => void;
  className?: string;
}

export const SMART_FILTERS: SmartFilter[] = [
  {
    id: 'pregnant',
    label: 'En Gestación',
    icon: Baby,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/40',
    activeColorClass:
      'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/50 shadow-sm shadow-amber-500/10',
    queryParam: 'is_pregnant',
    value: 'true',
    tooltip: 'Filtras hembras con gestación activa',
  },
  {
    id: 'lactating',
    label: 'En Lactancia',
    icon: Milk,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-500/40',
    activeColorClass:
      'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/50 shadow-sm shadow-blue-500/10',
    queryParam: 'is_lactating',
    value: 'true',
    tooltip: 'Filtra hembras en producción de leche',
  },
  {
    id: 'destetar',
    label: 'Para Destete',
    icon: Scissors,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/40',
    activeColorClass:
      'bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/50 shadow-sm shadow-violet-500/10',
    queryParam: 'destetar',
    value: 'true',
    tooltip: 'Terneros de 7 a 8 meses a punto de destetar',
  },
  {
    id: 'bajo_peso',
    label: 'Bajo Peso',
    icon: TrendingDown,
    colorClass:
      'text-muted-foreground border-border/60 bg-card/40 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 hover:border-red-500/40',
    activeColorClass:
      'bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/50 shadow-sm shadow-red-500/10',
    queryParam: 'bajo_peso',
    value: 'true',
    tooltip: 'Animales por debajo del peso estándar de su raza y edad',
  },
];

const chipBase =
  'h-8 shrink-0 snap-start rounded-full border px-3 text-xs font-semibold gap-1.5 transition-all duration-200 active:scale-95 whitespace-nowrap shadow-none';

export function SmartFiltersToolbar({
  activeFilters: propActiveFilters,
  onFilterChange: propOnFilterChange,
  className = '',
}: SmartFiltersToolbarProps) {
  const [searchParams, setSearchParams] = useSearchParams();

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

  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center gap-2',
        className
      )}
      role="toolbar"
      aria-label="Filtros del inventario"
    >
      {/* Etiqueta del grupo — visible desde md para no robar ancho en móvil */}
      <div className="hidden md:flex shrink-0 items-center gap-1.5 border-r border-border/60 pr-2">
        <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Filtros
        </span>
        {activeCount > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold leading-none text-primary-foreground">
            {activeCount}
          </span>
        )}
      </div>

      {/* Chips: en móvil la fila se desliza horizontalmente */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-0.5 -mb-0.5 scroll-smooth hide-scrollbar snap-x snap-mandatory">
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
              <Icon className={cn('h-3.5 w-3.5 shrink-0', isActive && 'stroke-[2.5]')} />
              {filter.label}
              {isActive && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
              )}
            </Button>
          );
        })}

        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className={cn(
              chipBase,
              'h-8 shrink-0 border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            )}
            title="Quitar todos los filtros"
          >
            <X className="h-3.5 w-3.5 shrink-0" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

export default SmartFiltersToolbar;
