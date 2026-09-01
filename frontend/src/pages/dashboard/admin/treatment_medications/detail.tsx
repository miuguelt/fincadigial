import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';

/**
 * Redirecciona al flujo modal de AdminTreatmentMedicationsPage conforme al estándar de UI y Protocolo GEMINI.md.
 */
export default function TreatmentMedicationDetailPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { rolePath } = useRoleNavigation();

  useEffect(() => {
    const basePath = rolePath('/admin/treatment_medications');
    if (id) {
      navigate(`${basePath}?detail=${id}`, { replace: true });
    } else {
      navigate(basePath, { replace: true });
    }
  }, [id, navigate, rolePath]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center space-y-2 animate-pulse">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-muted-foreground text-xs font-semibold">Cargando detalle de medicamento...</p>
      </div>
    </div>
  );
}
