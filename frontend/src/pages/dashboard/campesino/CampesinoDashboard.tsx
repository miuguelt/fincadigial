import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { DashboardHero } from './components/DashboardHero';
import { DashboardSearch } from './components/DashboardSearch';
import { DashboardTip } from './components/DashboardTip';
import { MiJornadaSection } from './components/MiJornadaSection';
import { TermometroGanadoSection } from './components/TermometroGanadoSection';
import { QuickActionsSection } from './components/QuickActionsSection';
import { ToolGroupsSection } from './components/ToolGroupsSection';
import { useCampesinoDashboardState } from './hooks/useCampesinoDashboardState';

const CampesinoDashboard = () => {
  const { goTo } = useRoleNavigation();
  const {
    user,
    isOnline,
    pendingCount,
    searchTerm,
    setSearchTerm,
    filteredGroups,
    tip,
  } = useCampesinoDashboardState();
  const fincaName = user?.finca_name || user?.finca?.name || 'tu Finca';
  const hasSearch = searchTerm.trim().length > 0;

  return (
    <div className="min-h-full bg-background pb-20">
      <div className="w-full space-y-6 px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        {/* Cabecera institucional y resumen de finca/clima */}
        <DashboardHero fincaName={fincaName} isOnline={isOnline} pendingCount={pendingCount} />

        {/* Jerarquía de Información (GEMINI.md): KPIs en primer viewport */}
        {!hasSearch && <TermometroGanadoSection />}

        {/* Acciones operativas frecuentes en campo */}
        {!hasSearch && <QuickActionsSection onNavigate={goTo} />}

        {/* Jornada diaria y alertas sanitarias prioritarias */}
        {!hasSearch && <MiJornadaSection />}

        {/* Buscador de herramientas */}
        <DashboardSearch value={searchTerm} onChange={setSearchTerm} />

        {/* Directorio de herramientas y módulos */}
        <ToolGroupsSection groups={filteredGroups} onClearSearch={() => setSearchTerm('')} onNavigate={goTo} />

        {/* Recomendación operativa contextual */}
        <DashboardTip tip={tip} />
      </div>
    </div>
  );
};

export default CampesinoDashboard;
