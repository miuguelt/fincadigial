import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { DashboardHero } from './components/DashboardHero';
import { DashboardSearch } from './components/DashboardSearch';
import { DashboardTip } from './components/DashboardTip';
import { MiJornadaSection } from './components/MiJornadaSection';
import { TermometroHatoSection } from './components/TermometroHatoSection';
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
    <div className="min-h-screen bg-gradient-to-br from-green-50/50 via-background to-emerald-50/30 dark:from-green-950/20 dark:via-background dark:to-emerald-950/10 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10 space-y-8 md:space-y-12">
        <DashboardHero fincaName={fincaName} isOnline={isOnline} pendingCount={pendingCount} />
        <DashboardSearch value={searchTerm} onChange={setSearchTerm} />
        {!hasSearch && <TermometroHatoSection />}
        {!hasSearch && <MiJornadaSection />}
        {!hasSearch && <QuickActionsSection onNavigate={goTo} />}
        <ToolGroupsSection groups={filteredGroups} onClearSearch={() => setSearchTerm('')} onNavigate={goTo} />
        <DashboardTip tip={tip} />
      </div>
    </div>
  );
};

export default CampesinoDashboard;
