import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

/**
 * Redirecciona al flujo modal de AdminFoodTypesPage conforme al estándar de UI y Protocolo GEMINI.md:
 * "TODOS los formularios que existan o se creen en la aplicación DEBEN presentarse como modales (Dialogs) flotantes".
 */
export default function FoodTypesCreatePage() {
  const navigate = useNavigate();
  const { rolePath } = useRoleNavigation();

  useEffect(() => {
    navigate(`${rolePath('/admin/food-types')}?create=true`, { replace: true });
  }, [navigate, rolePath]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2 animate-pulse">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-xs font-semibold">Abriendo formulario de tipos de alimento...</p>
      </div>
    </div>
  );
}

