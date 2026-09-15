import { LayoutGrid, Search, TableProperties, X } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { ROLES_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from '../hooks/useGlobalUsersFilters';

export type GlobalUsersViewMode = 'cards' | 'table';

const SELECT_CLASS =
  'h-8 sm:h-9 rounded-xl border border-border/70 bg-card/60 px-2.5 py-1 ' +
  'text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer shadow-2xs transition-colors';

interface GlobalUsersSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const GlobalUsersSearchInput = ({
  value,
  onChange,
  className,
}: GlobalUsersSearchInputProps) => (
  <div className={cn('relative isolate !h-auto w-full sm:w-64 md:w-80 lg:w-96', className)}>
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    <Input
      placeholder="Buscar por nombre, correo, cédula o finca..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pl-9 pr-8 h-8 sm:h-9 text-xs border-border/70 bg-card/60 focus-visible:ring-primary rounded-xl shadow-2xs"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
        aria-label="Limpiar búsqueda"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

interface GlobalUsersBottomBarProps {
  selectedRole: string;
  onRoleChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  viewMode: GlobalUsersViewMode;
  onViewModeChange: (mode: GlobalUsersViewMode) => void;
  hasActiveFilters?: boolean;
  onResetFilters?: () => void;
  filteredCount?: number;
  totalCount?: number;
}

export const GlobalUsersBottomBar = ({
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  viewMode,
  onViewModeChange,
  hasActiveFilters,
  onResetFilters,
  filteredCount,
  totalCount,
}: GlobalUsersBottomBarProps) => (
  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
    {/* Left: View Switcher + Filter Dropdowns */}
    <div className="flex flex-wrap items-center gap-2">
      {/* Selector de Vista: Tarjetas vs Tabla */}
      <div className="flex items-center border border-border/70 rounded-xl p-0.5 bg-card/60 shrink-0 shadow-2xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('cards')}
          className={cn(
            'h-8 px-2.5 rounded-lg text-xs font-semibold transition-all',
            viewMode === 'cards'
              ? 'bg-background shadow-xs text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Vista de Tarjetas"
          aria-label="Vista de Tarjetas"
        >
          <LayoutGrid className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Tarjetas</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onViewModeChange('table')}
          className={cn(
            'h-8 px-2.5 rounded-lg text-xs font-semibold transition-all',
            viewMode === 'table'
              ? 'bg-background shadow-xs text-foreground font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title="Vista de Tabla"
          aria-label="Vista de Tabla"
        >
          <TableProperties className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Tabla</span>
        </Button>
      </div>

      <div className="hidden sm:block h-4 w-px bg-border/60 mx-0.5" />

      {/* Filtro por Rol */}
      <div className="flex items-center gap-1.5">
        <select
          value={selectedRole}
          onChange={(e) => onRoleChange(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrar por rol"
        >
          {ROLES_FILTER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por Estado */}
      <div className="flex items-center">
        <select
          value={selectedStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className={SELECT_CLASS}
          aria-label="Filtrar por estado"
        >
          {STATUS_FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>

    {/* Right: Active Filters Reset & Count */}
    <div className="flex items-center gap-2 self-end sm:self-auto">
      {hasActiveFilters && onResetFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onResetFilters}
          className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground rounded-lg"
          title="Restablecer filtros"
        >
          <X className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
          <span>Limpiar filtros</span>
        </Button>
      )}
      {typeof filteredCount === 'number' && typeof totalCount === 'number' && (
        <span className="text-xs text-muted-foreground font-medium tabular-nums">
          {filteredCount === totalCount ? `${totalCount} registros` : `${filteredCount} de ${totalCount} registros`}
        </span>
      )}
    </div>
  </div>
);
