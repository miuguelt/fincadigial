import { useNavigate, useSearchParams } from 'react-router-dom';
import { Map as MapIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';

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
    <div className="flex items-center gap-1">
      <Button variant={!isPotreros && viewMode === 'table' ? 'primary' : 'outline'} size="sm" className="h-9 px-3 text-sm" onClick={() => goToCrudView('table')} aria-label="Vista en tabla">Tabla</Button>
      <Button variant={!isPotreros && viewMode === 'cards' ? 'primary' : 'outline'} size="sm" className="h-9 px-3 text-sm" onClick={() => goToCrudView('cards')} aria-label="Vista en tarjetas">Tarjetas</Button>
      <Button variant={isPotreros ? 'primary' : 'outline'} size="sm" className="h-9 gap-2 px-3 text-sm" onClick={() => { const params = new URLSearchParams(searchParams); params.set('vista', 'potreros'); navigate(`?${params.toString()}`); }} aria-label="Vista Potreros"><MapIcon size={16} />Potreros</Button>
    </div>
  );
}
