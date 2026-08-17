import { Filter, LayoutGrid, Search, TableProperties, X } from 'lucide-react';
import { Card, CardContent } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { ROLES_FILTER_OPTIONS, STATUS_FILTER_OPTIONS } from '../hooks/useGlobalUsersFilters';

export type GlobalUsersViewMode = 'cards' | 'table';

const SELECT_CLASS =
  'w-full sm:w-auto h-10 rounded-xl border border-border/80 bg-background px-3 py-1.5 ' +
  'text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer';

interface GlobalUsersToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedRole: string;
  onRoleChange: (value: string) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  viewMode: GlobalUsersViewMode;
  onViewModeChange: (mode: GlobalUsersViewMode) => void;
}

/** Búsqueda, filtros de rol y estado, y selector de vista tarjetas/tabla. */
export const GlobalUsersToolbar = ({
  searchTerm,
  onSearchChange,
  selectedRole,
  onRoleChange,
  selectedStatus,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: GlobalUsersToolbarProps) => (
  <Card className="!h-auto border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
    <CardContent className="p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, correo, cédula o finca..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-9 border-border/80 focus-visible:ring-emerald-500 rounded-xl h-10"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 min-w-[150px] flex-1 sm:flex-initial">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0 hidden sm:inline" />
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

          <div className="flex items-center min-w-[150px] flex-1 sm:flex-initial">
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

          <div className="flex items-center bg-muted/60 rounded-xl p-1 border border-border/60 shrink-0">
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'cards' ? 'primary' : 'ghost'}
              onClick={() => onViewModeChange('cards')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold transition-all',
                viewMode === 'cards'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Vista de Tarjetas"
              aria-label="Vista de Tarjetas"
            >
              <LayoutGrid className="h-4 w-4 mr-1.5" />
              Tarjetas
            </Button>
            <Button
              type="button"
              size="sm"
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              onClick={() => onViewModeChange('table')}
              className={cn(
                'h-8 px-3 rounded-lg text-xs font-bold transition-all',
                viewMode === 'table'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              title="Vista de Tabla"
              aria-label="Vista de Tabla"
            >
              <TableProperties className="h-4 w-4 mr-1.5" />
              Tabla
            </Button>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);
