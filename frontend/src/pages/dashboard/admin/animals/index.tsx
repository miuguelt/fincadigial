import { useSearchParams } from 'react-router-dom';
import { AnimalsViewSwitcher } from './components/AnimalsViewSwitcher';
import { PotrerosBoardPage } from '@/features/potreros';
import { AnimalCrudContent } from './components/AnimalCrudContent';
import { useAnimalCrudModel } from './hooks/useAnimalCrudModel';

function AnimalsCrudPage() {
  return <AnimalCrudContent {...useAnimalCrudModel()} />;
}

/**
 * `?vista=potreros` no es un modo del CRUD: el tablero agrupa por potrero y
 * necesita el inventario completo, así que se monta como página propia.
 */
function AdminAnimalsPage() {
  const [searchParams] = useSearchParams();

  if (searchParams.get('vista') === 'potreros') {
    return <PotrerosBoardPage viewSwitcher={<AnimalsViewSwitcher />} />;
  }

  return <AnimalsCrudPage />;
}

export default AdminAnimalsPage;
