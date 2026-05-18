import React from 'react';
import { Card, CardContent } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { IconCalendar, IconPlus } from '@/shared/ui/icons';

interface ControlEmptyStateProps {
  searchQuery: string;
  selectedAnimalFilter: string;
  selectedStatusFilter: string;
  dateFilter: string;
  openCreateModal: () => void;
}

export const ControlEmptyState: React.FC<ControlEmptyStateProps> = ({
  searchQuery,
  selectedAnimalFilter,
  selectedStatusFilter,
  dateFilter,
  openCreateModal,
}) => {
  const hasFilters = searchQuery || selectedAnimalFilter !== 'all' || selectedStatusFilter !== 'all' || dateFilter;

  return (
    <div className="col-span-full">
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <IconCalendar className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay controles registrados</h3>
          <p className="text-muted-foreground text-center mb-4">
            {hasFilters
              ? 'No hay controles que coincidan con los filtros aplicados'
              : 'Comienza registrando el primer control sanitario'}
          </p>
          <Button onClick={openCreateModal}>
            <IconPlus size="sm" className="mr-2" />
            Crear Primer Control
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

