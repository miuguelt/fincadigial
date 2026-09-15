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
  /**
   * `inline` (por defecto) deja el slot personalizado junto al botón de crear:
   * sirve para controles cortos (conmutadores de vista, un botón suelto).
   * `row` lo baja a una fila propia de ancho completo, que es lo que necesita
   * un bloque ancho —una fila de chips— para no empujar el encabezado más allá
   * del viewport ni robarle ancho al título.
   */
  toolbarPlacement?: 'inline' | 'row';
  /**
   * La búsqueda arranca compacta y se expande al recibir foco. Sirve para
   * mantener todo el toolbar en una sola fila: el espacio que gana el campo
   * al enfocarlo se lo quita al slot personalizado, que envuelve sus chips
   * dentro de su bloque.
   */
  expandableSearch?: boolean;
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
  toolbarPlacement = 'inline',
  expandableSearch = false,
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

  const inlineCustomToolbar = toolbarPlacement === 'inline' ? customToolbar : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full min-w-0">
        <div
          className={cn(
            'relative group min-w-0',
            expandableSearch
              ? 'w-full sm:w-52 md:w-64 lg:w-72 xl:w-80 focus-within:w-full transition-all duration-300 ease-out'
              : 'flex-1 w-full sm:w-60 md:w-72 lg:w-80 sm:max-w-xs md:max-w-sm sm:flex-none',
          )}
        >
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors h-4 w-4" />
          <Input
            type="search"
            placeholder={searchPlaceholder || 'Buscar...'}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              "pl-9 w-full h-11 text-sm rounded-xl border-border/50 bg-background/50 focus:bg-background transition-all shadow-sm",
              searchQuery && "pr-11"
            )}
            aria-label="Buscar registros"
            data-tour="entity-search"
            style={{ fontSize: '16px' }} /* Evitar zoom en iOS */
          />
          {/* Botón clear (X) cuando hay texto */}
          {searchQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {onToggleFullScreen && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onToggleFullScreen}
              className={cn(
                "h-11 min-h-[44px] px-3 rounded-xl border-border/60 font-semibold text-xs gap-1.5 transition-all shadow-sm",
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
              className="h-11 w-11 sm:w-auto min-h-[44px] min-w-[44px] sm:px-4 rounded-xl shadow-md shadow-primary/10 hover:shadow-lg hover:shadow-primary/20 transition-all"
              onClick={onOpenCreate}
              disabled={saving}
              aria-label={createLabel}
              data-tour="entity-create"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Nuevo</span>
            </Button>
          )}

          {inlineCustomToolbar && (
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              {inlineCustomToolbar}
            </div>
          )}
        </div>
      </div>

      {toolbarPlacement === 'row' && customToolbar && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5">
          {customToolbar}
        </div>
      )}
    </div>
  );
});

CRUDToolbar.displayName = 'CRUDToolbar';

export default CRUDToolbar;
