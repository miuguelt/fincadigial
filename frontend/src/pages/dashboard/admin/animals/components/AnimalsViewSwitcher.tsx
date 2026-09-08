import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map as MapIcon, LayoutGrid, Table } from 'lucide-react';
import { Button } from '@/shared/ui/button';
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

  return (
    <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3">
      {/* Conmutador de vista (segmented control, mobile-first) */}
      <div
        className="flex items-center gap-1 rounded-xl border border-border/50 bg-card/60 p-1 shadow-sm w-full lg:w-auto lg:shrink-0"
        role="group"
        aria-label="Cambiar vista del inventario"
      >
        <Button
          variant={!isPotreros && viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 lg:flex-none whitespace-nowrap rounded-lg px-3 text-xs font-bold lg:min-w-16"
          onClick={() => goToCrudView('table')}
          aria-pressed={!isPotreros && viewMode === 'table'}
          aria-label="Vista en tabla"
        >
          <Table className="h-3.5 w-3.5 mr-1" />
          Tabla
        </Button>
        <Button
          variant={!isPotreros && viewMode === 'cards' ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 lg:flex-none whitespace-nowrap rounded-lg px-3 text-xs font-bold lg:min-w-16"
          onClick={() => goToCrudView('cards')}
          aria-pressed={!isPotreros && viewMode === 'cards'}
          aria-label="Vista en tarjetas"
        >
          <LayoutGrid className="h-3.5 w-3.5 mr-1" />
          Tarjetas
        </Button>
        <Button
          variant={isPotreros ? 'primary' : 'ghost'}
          size="sm"
          className="h-8 flex-1 lg:flex-none whitespace-nowrap rounded-lg px-3 text-xs font-bold lg:min-w-16"
          onClick={goToPotreros}
          aria-pressed={isPotreros}
          aria-label="Vista Potreros"
        >
          <MapIcon size={14} className="mr-1" />
          Potreros
        </Button>
      </div>

      {/* Chips de filtros inteligentes */}
      {!isPotreros && <SmartFiltersToolbar />}
    </div>
  );
}
