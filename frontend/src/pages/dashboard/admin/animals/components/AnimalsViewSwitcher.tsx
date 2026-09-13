import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, LayoutGrid, Table } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { SmartFiltersToolbar } from '@/widgets/admin-crud/ui/SmartFiltersToolbar';

export function AnimalsViewSwitcher() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [viewMode, setViewMode] = useGlobalViewMode();
  const isPotreros = searchParams.get('vista') === 'potreros';

  const goToCrudView = (mode: 'table' | 'cards') => {
    const params = new URLSearchParams(searchParams);
    params.delete('vista');
    const query = params.toString();
    navigate(query ? `?${query}` : '?');
    setViewMode(mode);
  };

  const goToPotreros = () => {
    const params = new URLSearchParams(searchParams);
    params.set('vista', 'potreros');
    navigate(`?${params.toString()}`);
  };

  const viewButtonClass =
    'h-9 flex-1 sm:flex-none justify-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 sm:px-3 text-xs font-bold';

  return (
    <div className="flex min-w-0 flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full">
      {/* Conmutador de vista: iconos en móvil, etiquetas desde sm */}
      <div
        className="flex items-center gap-1 rounded-xl border border-border/50 bg-card/60 p-1 shadow-sm w-full sm:w-auto sm:shrink-0"
        role="group"
        aria-label="Cambiar vista del inventario"
      >
        <Button
          variant={!isPotreros && viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          className={cn(viewButtonClass, !isPotreros && viewMode !== 'table' && 'min-w-0')}
          onClick={() => goToCrudView('table')}
          aria-pressed={!isPotreros && viewMode === 'table'}
          aria-label="Vista en tabla"
          title="Vista en tabla"
        >
          <Table className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Tabla</span>
        </Button>
        <Button
          variant={!isPotreros && viewMode === 'cards' ? 'primary' : 'ghost'}
          size="sm"
          className={cn(viewButtonClass, !isPotreros && viewMode !== 'cards' && 'min-w-0')}
          onClick={() => goToCrudView('cards')}
          aria-pressed={!isPotreros && viewMode === 'cards'}
          aria-label="Vista en tarjetas"
          title="Vista en tarjetas"
        >
          <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">Tarjetas</span>
        </Button>
        <Button
          variant={isPotreros ? 'primary' : 'ghost'}
          size="sm"
          className={cn(viewButtonClass, !isPotreros && 'min-w-0')}
          onClick={goToPotreros}
          aria-pressed={isPotreros}
          aria-label="Vista Potreros"
          title="Vista potreros"
        >
          <MapIcon size={14} className="shrink-0" />
          <span className="hidden sm:inline">Potreros</span>
        </Button>
      </div>

      {/* Filtros inteligentes: chips inline (md+) o botón + hoja inferior.
          `flex-1` a partir de sm: ocupan el resto de la fila y los chips
          envuelven dentro de su propio bloque, sin empujar el conmutador. */}
      {!isPotreros && (
        <div className="w-full min-w-0 sm:flex-1">
          <SmartFiltersToolbar />
        </div>
      )}
    </div>
  );
}
