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

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 w-full">
      {/* Conmutador de vistas */}
      <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border/40 shrink-0">
        <Button
          variant={!isPotreros && viewMode === 'table' ? 'primary' : 'ghost'}
          size="sm"
          className="h-9 min-w-0 flex-1 whitespace-nowrap px-3 text-xs font-bold sm:flex-none rounded-lg"
          onClick={() => goToCrudView('table')}
          aria-label="Vista en tabla"
        >
          <Table className="h-3.5 w-3.5 mr-1" />
          Tabla
        </Button>
        <Button
          variant={!isPotreros && viewMode === 'cards' ? 'primary' : 'ghost'}
          size="sm"
          className="h-9 min-w-0 flex-1 whitespace-nowrap px-3 text-xs font-bold sm:flex-none rounded-lg"
          onClick={() => goToCrudView('cards')}
          aria-label="Vista en tarjetas"
        >
          <LayoutGrid className="h-3.5 w-3.5 mr-1" />
          Tarjetas
        </Button>
        <Button
          variant={isPotreros ? 'primary' : 'ghost'}
          size="sm"
          className="h-9 min-w-0 flex-1 gap-1.5 whitespace-nowrap px-3 text-xs font-bold sm:flex-none rounded-lg"
          onClick={() => {
            const params = new URLSearchParams(searchParams);
            params.set('vista', 'potreros');
            navigate(`?${params.toString()}`);
          }}
          aria-label="Vista Potreros"
        >
          <MapIcon size={14} />
          Potreros
        </Button>
      </div>

      {/* Chips de filtros inteligentes */}
      {!isPotreros && <SmartFiltersToolbar />}
    </div>
  );
}
