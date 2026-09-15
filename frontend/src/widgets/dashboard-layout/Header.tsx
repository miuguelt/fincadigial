import React from 'react';
import { Menu } from 'lucide-react';
import { useAuth } from '@/features/auth/model/useAuth';
import { cn } from '@/shared/ui/cn';
import { SyncStatus } from '@/widgets/dashboard/SyncStatus';
import { Breadcrumbs } from '@/shared/ui/common';
import HeaderActions from './HeaderActions';
import HeaderSearch from './HeaderSearch';
import ProfileMenu from './profile-menu/ProfileMenu';
import { OnboardingRestartButton } from '@/widgets/onboarding/OnboardingTour';
import { FincaSelector } from '@/features/multi-finca/ui/FincaSelector';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { user } = useAuth();
  const hasFinca = !!user?.finca_id;

  return (
    <header
      className="sticky top-0 z-[1000] h-14 w-full border-b border-border bg-card shadow-sm sm:h-16"
      role="banner"
    >
      <div className="relative flex h-14 items-center gap-2 px-3 sm:h-16 sm:px-5 lg:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          {hasFinca && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                'flex h-11 w-11 sm:h-10 sm:w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex-shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground shadow-sm transition-colors duration-200 hover:border-primary hover:bg-primary hover:text-primary-foreground',
                isSidebarOpen && 'border-primary bg-primary text-primary-foreground',
              )}
              aria-label={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
              aria-controls="dashboard-sidebar"
              aria-expanded={!!isSidebarOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          )}

          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* Buscador: barra fija en escritorio, lupa desplegable en celular. */}
        {hasFinca && <HeaderSearch />}

        <div className="ml-auto flex flex-shrink-0 items-center gap-1">
          {hasFinca && (
            <>
              <div className="mr-2 hidden xl:block">
                <SyncStatus />
              </div>
              <OnboardingRestartButton />
              <HeaderActions />
            </>
          )}

          <div className="mx-1 h-5 w-[1px] bg-border" />

          {/* Finca Activa: selector visible permanentemente */}
          <div className="mr-0.5 sm:mr-1">
            <FincaSelector />
          </div>

          {/* Perfil: agrupa cuenta, tema, cambio de finca y salir. */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
