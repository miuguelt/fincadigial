import React, { useMemo } from 'react';
import { Menu, Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { cn } from '@/shared/ui/cn.ts';
import { SyncStatus } from '@/widgets/dashboard/SyncStatus';
import { Breadcrumbs } from '@/shared/ui/common';
import HeaderActions from './HeaderActions';
import HeaderCalendarDropdown from './HeaderCalendarDropdown';
import HeaderSearch from './HeaderSearch';
import ProfileMenu from './profile-menu/ProfileMenu';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const NEW_ACTION_BY_SECTION: Array<[string, string]> = [
  ['/animals', '+ Registrar Animal'],
  ['/fields', '+ Agregar Potrero'],
  ['/tasks', '+ Crear Tarea'],
];

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const hasFinca = !!user?.finca_id;

  // Botón "Nuevo" contextual según la sección abierta.
  const contextualNewAction = useMemo(() => {
    const path = location.pathname;
    const match = NEW_ACTION_BY_SECTION.find(([section]) => path.includes(section));
    if (!match) return null;
    return { label: match[1], action: () => navigate(`${path}?create=true`) };
  }, [location.pathname, navigate]);

  return (
    <header
      className="sticky top-0 z-[1000] h-14 w-full border-b border-border/30 bg-background/80 shadow-sm backdrop-blur-xl sm:h-16"
      role="banner"
    >
      <div className="relative flex h-14 items-center gap-2 px-2 sm:h-16 sm:px-3 lg:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {hasFinca && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border/40 bg-surface text-foreground shadow-sm transition-all duration-300 hover:bg-primary/10',
                isSidebarOpen && 'border-primary/20 bg-primary/10 text-primary',
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
          {contextualNewAction && (
            <button
              type="button"
              onClick={contextualNewAction.action}
              className="mr-1 hidden h-10 items-center gap-2 rounded-full bg-primary px-4 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:bg-primary/90 active:scale-95 md:inline-flex"
            >
              <Plus size={16} />
              {contextualNewAction.label}
            </button>
          )}

          {hasFinca && (
            <>
              <div className="mr-2 hidden xl:block">
                <SyncStatus />
              </div>
              <HeaderCalendarDropdown />
              <HeaderActions />
            </>
          )}

          <div className="mx-1 h-5 w-[1px] bg-border" />

          {/* Perfil: agrupa cuenta, tema, cambio de finca y salir. */}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
