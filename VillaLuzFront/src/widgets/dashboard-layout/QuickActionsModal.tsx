import { Suspense, lazy } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';

// Lazy load the quick action components to avoid bloating the main bundle
const QuickControl = lazy(() => import('@/pages/quick/QuickControl'));
const QuickTransfer = lazy(() => import('@/pages/quick/QuickTransfer'));
const QuickDisease = lazy(() => import('@/pages/quick/QuickDisease'));
const QuickTreatment = lazy(() => import('@/pages/quick/QuickTreatment'));
const QuickMilk = lazy(() => import('@/pages/quick/QuickMilk'));
const QuickWater = lazy(() => import('@/pages/quick/QuickWater'));

export function QuickActionsModal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const quickAction = searchParams.get('quick');
  
  // Si no hay acción rápida, el modal no debe renderizarse ni estar abierto
  const isOpen = !!quickAction;

  const handleClose = () => {
    // Eliminamos el parámetro 'quick' de la URL sin afectar otros parámetros
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('quick');
    setSearchParams(newSearchParams, { replace: true });
  };

  // Renderiza el componente correcto según el parámetro
  const renderActionContent = () => {
    switch (quickAction) {
      case 'control':
        return <QuickControl />;
      case 'transfer':
        return <QuickTransfer />;
      case 'disease':
        return <QuickDisease />;
      case 'treatment':
        return <QuickTreatment />;
      case 'milk':
        return <QuickMilk />;
      case 'water':
        return <QuickWater />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent 
        className="p-0 border-0 overflow-hidden bg-background max-w-lg w-full sm:rounded-lg"
        // Le damos un z-index alto para asegurarnos de que quede encima de todo
        zIndex={1200}
      >
        <div className="max-h-[90vh] overflow-y-auto">
          <Suspense fallback={<LoadingScreen message="Cargando formulario..." />}>
            {renderActionContent()}
          </Suspense>
        </div>
      </DialogContent>
    </Dialog>
  );
}
