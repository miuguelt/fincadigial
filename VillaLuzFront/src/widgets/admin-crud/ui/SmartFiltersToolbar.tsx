import React from 'react';
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

interface SmartFiltersToolbarProps {
  activeFilters: Record<string, any>;
  onFilterChange: (filters: Record<string, any>) => void;
}

export const SMART_FILTERS: SmartFilter[] = [
  {
    id: 'pregnant',
    label: 'En Gestación',
    icon: Sparkles,
    colorClass: 'hover:bg-amber-500/10 hover:text-amber-500 hover:border-amber-500/30 text-muted-foreground border-border/40 bg-card/40',
    activeColorClass: 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-500 border-amber-500/50 shadow-sm shadow-amber-500/10',
    queryParam: 'is_pregnant',
    value: 'true'
  },
  {
    id: 'lactating',
    label: 'En Lactancia',
    icon: Milk,
    colorClass: 'hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 text-muted-foreground border-border/40 bg-card/40',
    activeColorClass: 'bg-gradient-to-r from-blue-500/20 to-blue-600/20 text-blue-500 border-blue-500/50 shadow-sm shadow-blue-500/10',
    queryParam: 'is_lactating',
    value: 'true'
  },
  {
    id: 'destetar',
    label: 'Para Destete',
    icon: Baby,
    colorClass: 'hover:bg-purple-500/10 hover:text-purple-500 hover:border-purple-500/30 text-muted-foreground border-border/40 bg-card/40',
    activeColorClass: 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 text-purple-500 border-purple-500/50 shadow-sm shadow-purple-500/10',
    queryParam: 'destetar',
    value: 'true'
  },
  {
    id: 'bajo_peso',
    label: 'Bajo Peso',
    icon: Scale,
    colorClass: 'hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 text-muted-foreground border-border/40 bg-card/40',
    activeColorClass: 'bg-gradient-to-r from-red-500/20 to-red-600/20 text-red-500 border-red-500/50 shadow-sm shadow-red-500/10',
    queryParam: 'bajo_peso',
    value: 'true'
  }
];

export function SmartFiltersToolbar({ activeFilters, onFilterChange }: SmartFiltersToolbarProps) {
  const toggleFilter = (filter: SmartFilter) => {
    const newFilters = { ...activeFilters };
    if (newFilters[filter.queryParam] === filter.value) {
      delete newFilters[filter.queryParam];
    } else {
      newFilters[filter.queryParam] = filter.value;
    }
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const newFilters = { ...activeFilters };
    SMART_FILTERS.forEach(f => {
      delete newFilters[f.queryParam];
    });
    onFilterChange(newFilters);
  };

  const hasActiveSmartFilters = SMART_FILTERS.some(f => activeFilters[f.queryParam] === f.value);

  return (
    <div className="flex flex-wrap items-center gap-2 py-2 px-1 rounded-xl bg-gradient-to-b from-card/10 via-card/5 to-transparent border border-border/10 backdrop-blur-md">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pl-1 mr-1">
        Filtros Inteligentes:
      </span>
      <div className="flex flex-wrap gap-2">
        {SMART_FILTERS.map((filter) => {
          const isActive = activeFilters[filter.queryParam] === filter.value;
          const Icon = filter.icon;
          return (
            <Button
              key={filter.id}
              variant="outline"
              size="sm"
              onClick={() => toggleFilter(filter)}
              className={`h-9 px-3 text-xs sm:text-sm font-medium rounded-xl border transition-all duration-200 active:scale-[0.97] flex items-center gap-1.5 ${
                isActive ? filter.activeColorClass : filter.colorClass
              }`}
            >
              <Icon className="h-4 w-4" />
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
            className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all"
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
