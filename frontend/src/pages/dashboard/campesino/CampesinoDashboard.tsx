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
      <div className="mx-auto w-full max-w-6xl space-y-5 px-3 py-4 sm:space-y-8 sm:px-6 sm:py-7 lg:px-8">
        <DashboardHero fincaName={fincaName} isOnline={isOnline} pendingCount={pendingCount} />
        {!hasSearch && <MiJornadaSection />}
        {!hasSearch && <QuickActionsSection onNavigate={goTo} />}
        {!hasSearch && <TermometroGanadoSection />}
        <DashboardSearch value={searchTerm} onChange={setSearchTerm} />
        <ToolGroupsSection groups={filteredGroups} onClearSearch={() => setSearchTerm('')} onNavigate={goTo} />
        <DashboardTip tip={tip} />
      </div>
    </div>
  );
};

export default CampesinoDashboard;
