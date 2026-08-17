import { Users } from 'lucide-react';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';

interface GlobalUsersEmptyStateProps {
  hasActiveFilters: boolean;
  onResetFilters: () => void;
}

/** Directorio sin coincidencias. Solo ofrece restablecer si hay filtros puestos. */
export const GlobalUsersEmptyState = ({ hasActiveFilters, onResetFilters }: GlobalUsersEmptyStateProps) => (
  <Card className="border-border/60 shadow-sm p-12 text-center">
    <div className="flex flex-col items-center justify-center text-muted-foreground space-y-3">
      <Users className="h-16 w-16 opacity-20" />
      <h3 className="text-lg font-bold text-foreground">No se encontraron usuarios</h3>
      <p className="text-sm max-w-md">
        No hay registros que coincidan con los filtros seleccionados o el término de búsqueda.
      </p>
      {hasActiveFilters && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onResetFilters}
          className="mt-2 rounded-xl text-xs font-bold"
        >
          Restablecer Filtros
        </Button>
      )}
    </div>
  </Card>
);
