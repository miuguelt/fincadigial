import { Search, Filter, X, Info } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { typeIcons } from '@/shared/components/notifications/components/alertCard.constants';

type PriorityFilter = 'todas' | 'Crítica' | 'Alta' | 'Media' | 'Baja';
type TypeFilter = 'todas' | 'Salud' | 'Reproducción' | 'Crecimiento' | 'Producción' | 'Estado' | 'Personalizada' | 'Predictiva';
type ReadFilter = 'todas' | 'no_leidas' | 'leidas';

const typeFilterList: TypeFilter[] = ['todas', 'Salud', 'Reproducción', 'Crecimiento', 'Producción', 'Estado', 'Personalizada', 'Predictiva'];

const priorityConfig: Record<string, { dot: string; active: string; label: string }> = {
  Crítica:  { dot: 'bg-destructive',    active: 'bg-destructive/5 text-destructive ring-red-200 dark:bg-red-950/50 dark:text-red-300 dark:ring-red-800',    label: 'Crítica'  },
  Alta:     { dot: 'bg-orange-500', active: 'bg-orange-50 text-orange-700 ring-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:ring-orange-800', label: 'Alta'     },
  Media:    { dot: 'bg-warning',  active: 'bg-warning/5 text-warning ring-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:ring-amber-800',  label: 'Media'    },
  Baja:     { dot: 'bg-info/80',   active: 'bg-info/5 text-info ring-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:ring-blue-800',   label: 'Baja'     },
};

interface AlertFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  priorityFilter: PriorityFilter;
  onPriorityChange: (value: PriorityFilter) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
  readFilter: ReadFilter;
  onReadChange: (value: ReadFilter) => void;
}

const activeFilterCount = (
  priority: PriorityFilter,
  type: TypeFilter,
  read: ReadFilter
) => [priority !== 'todas', type !== 'todas', read !== 'todas'].filter(Boolean).length;

export function AlertFilterBar({
  searchQuery,
  onSearchChange,
  priorityFilter,
  onPriorityChange,
  typeFilter,
  onTypeChange,
  readFilter,
  onReadChange,
}: AlertFilterBarProps) {
  const filterCount = activeFilterCount(priorityFilter, typeFilter, readFilter);
  const hasActiveFilters = filterCount > 0 || searchQuery.length > 0;

  const resetAll = () => {
    onSearchChange('');
    onPriorityChange('todas');
    onTypeChange('todas');
    onReadChange('no_leidas');
  };

  return (
    <div className="rounded-lg border border-border/60 bg-card/80 backdrop-blur-sm shadow-sm overflow-hidden">
      {/* Header de la tarjeta de filtros */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Filter className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold">Filtros</span>
          {filterCount > 0 && (
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-primary text-primary-foreground">
              {filterCount}
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={resetAll}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-muted"
          >
            <X className="h-3 w-3" />
            Limpiar
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Búsqueda */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            id="alerts-search"
            placeholder="Buscar en alertas..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-9 bg-background/70 border-border/50 focus:border-primary/40 rounded-xl h-9 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Prioridad */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">
            Prioridad
          </span>
          <div className="flex flex-wrap gap-1.5">
            {(['todas', 'Crítica', 'Alta', 'Media', 'Baja'] as PriorityFilter[]).map((p) => {
              const isActive = priorityFilter === p;
              const cfg = priorityConfig[p];
              return (
                <button
                  key={p}
                  onClick={() => onPriorityChange(p)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200',
                    'flex items-center gap-1.5 ring-1',
                    isActive
                      ? p === 'todas'
                        ? 'bg-primary/10 text-primary ring-primary/30'
                        : cfg.active
                      : 'bg-muted/60 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border/50',
                    isActive && 'shadow-sm'
                  )}
                >
                  {p !== 'todas' && (
                    <span className={cn(
                      'w-1.5 h-1.5 rounded-full transition-all',
                      cfg.dot,
                      isActive && 'shadow-[0_0_4px_currentColor]'
                    )} />
                  )}
                  {p === 'todas' ? 'Todas' : p}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tipo */}
        <div className="flex flex-wrap items-start gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0 mt-1.5">
            Tipo
          </span>
          <div className="flex flex-wrap gap-1.5">
            {typeFilterList.map((t) => {
              const Icon = typeIcons[t] || Info;
              const isActive = typeFilter === t;
              return (
                <button
                  key={t}
                  onClick={() => onTypeChange(t)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-200',
                    'flex items-center gap-1.5 ring-1',
                    isActive
                      ? 'bg-primary/10 text-primary ring-primary/30 shadow-sm'
                      : 'bg-muted/60 text-muted-foreground ring-transparent hover:bg-muted hover:ring-border/50'
                  )}
                >
                  {t !== 'todas' && <Icon className="h-3 w-3" />}
                  {t === 'todas' ? 'Todos' : t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Estado de lectura */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-16 shrink-0">
            Estado
          </span>
          <div className="flex gap-1 p-1 bg-muted/50 rounded-xl">
            {([
              { key: 'no_leidas' as ReadFilter, label: 'Sin leer' },
              { key: 'leidas' as ReadFilter,   label: 'Leídas'  },
              { key: 'todas'    as ReadFilter,  label: 'Todas'   },
            ]).map((f) => (
              <button
                key={f.key}
                onClick={() => onReadChange(f.key)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200',
                  readFilter === f.key
                    ? 'bg-background text-foreground shadow-sm ring-1 ring-border/30'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export type { PriorityFilter, TypeFilter, ReadFilter };
export default AlertFilterBar;
