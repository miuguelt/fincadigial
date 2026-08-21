import React, { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Milk, Baby, Scale, Sparkles, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';

export interface SmartFilter {
  id: string;
  label: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  activeColorClass: string;
  queryParam: string;
  value: any;
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
    icon: Sparkles,
    colorClass: 'hover:bg-amber-500/10 hover:text-amber-600 hover:border-amber-500/30 text-muted-foreground border-border/50 bg-card/60',
    activeColorClass: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/60 shadow-sm shadow-amber-500/10 font-bold',
    queryParam: 'is_pregnant',
    value: 'true'
  },
  {
    id: 'lactating',
    label: 'En Lactancia',
    icon: Milk,
    colorClass: 'hover:bg-blue-500/10 hover:text-blue-600 hover:border-blue-500/30 text-muted-foreground border-border/50 bg-card/60',
    activeColorClass: 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/60 shadow-sm shadow-blue-500/10 font-bold',
    queryParam: 'is_lactating',
    value: 'true'
  },
  {
    id: 'destetar',
    label: 'Para Destete',
    icon: Baby,
    colorClass: 'hover:bg-purple-500/10 hover:text-purple-600 hover:border-purple-500/30 text-muted-foreground border-border/50 bg-card/60',
    activeColorClass: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/60 shadow-sm shadow-purple-500/10 font-bold',
    queryParam: 'destetar',
    value: 'true'
  },
  {
    id: 'bajo_peso',
    label: 'Bajo Peso',
    icon: Scale,
    colorClass: 'hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 text-muted-foreground border-border/50 bg-card/60',
    activeColorClass: 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/60 shadow-sm shadow-red-500/10 font-bold',
    queryParam: 'bajo_peso',
    value: 'true'
  }
];

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

  const hasActiveSmartFilters = SMART_FILTERS.some(f => activeFilters[f.queryParam] === f.value);

  return (
    <div className={`flex items-center gap-1.5 py-1 px-1 rounded-xl overflow-x-auto hide-scrollbar ${className}`}>
      <div className="flex items-center gap-1.5 shrink-0">
        {SMART_FILTERS.map((filter) => {
          const isActive = activeFilters[filter.queryParam] === filter.value;
          const Icon = filter.icon;
          return (
            <Button
              key={filter.id}
              variant="outline"
              size="sm"
              onClick={() => toggleFilter(filter)}
              className={`h-9 px-2.5 sm:px-3 text-xs font-semibold rounded-xl border transition-all duration-200 active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
                isActive ? filter.activeColorClass : filter.colorClass
              }`}
              aria-pressed={isActive}
            >
              <Icon className="h-3.5 w-3.5" />
              {filter.label}
              {isActive && (
                <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              )}
            </Button>
          );
        })}

        {hasActiveSmartFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-xl transition-all whitespace-nowrap"
            title="Limpiar filtros inteligentes"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

export default SmartFiltersToolbar;
