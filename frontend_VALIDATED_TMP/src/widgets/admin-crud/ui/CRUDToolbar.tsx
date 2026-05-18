/*
 * CRUDToolbar
 * 
 * Componente optimizado para la barra de herramientas de CRUD.
 * Implementa búsqueda eficiente y acciones principales.
 */

import React, { memo, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';

interface CRUDToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onOpenCreate?: () => void;
  customToolbar?: React.ReactNode;
}

export const CRUDToolbar = memo<CRUDToolbarProps>(({
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  onOpenCreate,
  customToolbar,
}) => {
  // Manejar cambio de búsqueda con debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, [setSearchQuery]);
  
  return (
    <div className="flex items-center gap-1.5 sm:gap-3">
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
        <Input
          placeholder={searchPlaceholder || 'Buscar...'}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9 w-32 sm:w-64 h-9 sm:h-10 text-sm rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all shadow-sm"
        />
      </div>
      
      <div className="flex items-center gap-1.5">
        {onOpenCreate && (
          <Button
            size="sm"
            className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-xl shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all"
            onClick={onOpenCreate}
            aria-label="Crear nuevo registro"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        )}
        
        {customToolbar && (
          <div className="flex items-center gap-1.5">
            {customToolbar}
          </div>
        )}
      </div>
    </div>
  );
});

CRUDToolbar.displayName = 'CRUDToolbar';

export default CRUDToolbar;
