/*
 * CRUDToolbar
 *
 * Componente optimizado para la barra de herramientas de CRUD.
 * Implementa búsqueda eficiente con clear button y acciones principales.
 */

import React, { memo, useCallback } from 'react';
import { Search, Plus, X, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Input } from '@/shared/ui/input';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn.ts';

interface CRUDToolbarProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchPlaceholder?: string;
  onOpenCreate?: () => void;
  createLabel?: string;
  customToolbar?: React.ReactNode;
  saving?: boolean;
  onToggleFullScreen?: () => void;
  isFullScreen?: boolean;
}

export const CRUDToolbar = memo<CRUDToolbarProps>(({
  searchQuery,
  setSearchQuery,
  searchPlaceholder,
  onOpenCreate,
  createLabel = 'Crear nuevo registro',
  customToolbar,
  saving = false,
  onToggleFullScreen,
  isFullScreen = false,
}) => {
  // Manejar cambio de búsqueda
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
  }, [setSearchQuery]);

  const handleClear = useCallback(() => {
    setSearchQuery('');
  }, [setSearchQuery]);

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
      <div className="relative group flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
        <Input
          placeholder={searchPlaceholder || 'Buscar...'}
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className={cn(
            "pl-9 w-full h-10 text-sm rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all shadow-sm",
            searchQuery && "pr-8"
          )}
          aria-label="Buscar registros"
          style={{ fontSize: '16px' }} /* Evitar zoom en iOS */
        />
        {/* Botón clear (X) cuando hay texto */}
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        {onToggleFullScreen && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onToggleFullScreen}
            className={cn(
              "h-10 px-3 rounded-xl border-border/60 font-semibold text-xs gap-1.5 transition-all shadow-sm",
              isFullScreen
                ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary"
                : "bg-background/80 text-foreground hover:bg-muted"
            )}
            title={isFullScreen ? "Salir de Pantalla Completa (ESC)" : "Ver Tabla en Pantalla Completa"}
            aria-label={isFullScreen ? "Salir de pantalla completa" : "Pantalla completa"}
          >
            {isFullScreen ? (
              <>
                <Minimize2 className="h-4 w-4" />
                <span className="hidden md:inline">Restaurar</span>
              </>
            ) : (
              <>
                <Maximize2 className="h-4 w-4 text-primary" />
                <span className="hidden md:inline">Pantalla Completa</span>
              </>
            )}
          </Button>
        )}

        {onOpenCreate && (
          <Button size="sm"
            className="h-10 w-10 sm:w-auto sm:px-4 rounded-xl shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all"
            onClick={onOpenCreate}
            disabled={saving}
            aria-label={createLabel}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 sm:mr-2" />
            )}
            <span className="hidden sm:inline">Nuevo</span>
          </Button>
        )}

        {customToolbar && (
          <div className="flex flex-wrap items-center gap-1.5">
            {customToolbar}
          </div>
        )}
      </div>
    </div>
  );
});

CRUDToolbar.displayName = 'CRUDToolbar';

export default CRUDToolbar;
