import { useCallback, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { normalizeRole } from '@/features/auth/api/auth.service';
import { toRolePath } from '@/shared/lib/routeAccess';
import { useSanidadStats } from './useSanidadStats';
import { SanidadCasesView } from './SanidadCasesView';
import { SanidadTreatmentsView } from './SanidadTreatmentsView';
import { consumeCaseNavigation, sendCaseFilter, sendCaseFocus, clearCaseNavigation } from './linkState';
import type { SanidadView } from './SanidadModuleHeader';

/**
 * Página del Módulo Sanidad: fusión de los registros de casos clínicos
 * (enfermedades por animal) y las aplicaciones sanitarias (tratamientos) en
 * una sola experiencia con estadísticas compartidas y enlaces cruzados.
 *
 * Las rutas se conservan: `/admin/disease-animals` abre Casos clínicos y
 * `/admin/treatments` abre Tratamientos, ambas renderizando este módulo.
 */
export function SanidadModulePage({ defaultView }: { defaultView?: SanidadView }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, role } = useAuth() as any;
  const currentRole = normalizeRole(role || user?.role) || String(role || user?.role || '');

  const statsData = useSanidadStats();

  // Contexto de cruce entre vistas (se consume una sola vez al montar)
  const initial = useMemo(() => consumeCaseNavigation(), []);
  const [caseFilter, setCaseFilter] = useState<number | null>(initial.caseFilter);
  const [focusCaseId, setFocusCaseId] = useState<number | null>(initial.focusCaseId);

  const view: SanidadView = useMemo(() => {
    if (location.pathname.includes('/treatments')) return 'tratamientos';
    if (defaultView) return defaultView;
    return 'casos';
  }, [location.pathname, defaultView]);

  // Enlace: caso clínico -> sus registros de tratamiento
  const showTreatmentsForCase = useCallback(
    (caseId: number) => {
      sendCaseFilter(caseId);
      setCaseFilter(caseId);
      setFocusCaseId(null);
      navigate(toRolePath(currentRole, '/admin/treatments'));
    },
    [currentRole, navigate]
  );

  // Enlace: tratamiento -> seguimiento completo del caso
  const openCase = useCallback(
    (caseId: number) => {
      sendCaseFocus(caseId);
      setFocusCaseId(caseId);
      setCaseFilter(null);
      navigate(toRolePath(currentRole, '/admin/disease-animals'));
    },
    [currentRole, navigate]
  );

  const clearCaseFilter = useCallback(() => {
    setCaseFilter(null);
  }, []);

  // Navegación normal por el conmutador: sin cruce pendiente
  const onViewChange = useCallback(
    (target: SanidadView) => {
      if (target === view) return;
      clearCaseNavigation();
      setCaseFilter(null);
      setFocusCaseId(null);
      navigate(toRolePath(currentRole, target === 'tratamientos' ? '/admin/treatments' : '/admin/disease-animals'));
    },
    [view, currentRole, navigate]
  );

  if (view === 'tratamientos') {
    return (
      <SanidadTreatmentsView
        stats={statsData}
        refreshStats={statsData.refresh}
        caseFilter={caseFilter}
        onClearCaseFilter={clearCaseFilter}
        onOpenCase={openCase}
        onViewChange={onViewChange}
      />
    );
  }

  return (
    <SanidadCasesView
      stats={statsData}
      refreshStats={statsData.refresh}
      onShowTreatmentsForCase={showTreatmentsForCase}
      focusCaseId={focusCaseId}
      onViewChange={onViewChange}
    />
  );
}

export default SanidadModulePage;
