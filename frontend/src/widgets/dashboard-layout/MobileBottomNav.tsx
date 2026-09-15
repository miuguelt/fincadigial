import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Zap, Menu, X } from 'lucide-react';
import { IconCow, IconFence } from '@/shared/ui/icons';
import { useRoleNavigation } from '@/features/auth/model/useRoleNavigation';
import { useAuth } from '@/features/auth/model/useAuth';
import { prefetchRouteByPath, prefetchRoleRoutes } from '@/app/providers/auth/prefetchRoutes';
import { cn } from '@/shared/ui/cn';

interface MobileBottomNavProps {
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Barra de navegación inferior móvil (Zona del Pulgar / Mobile Thumb Zone).
 *
 * Optimizado para el trabajo de campo con una sola mano:
 * Permite alternar entre Inicio, Ganado, Potreros, abrir el menú completo
 * o desplegar las acciones rápidas sin forzar el alcance a la esquina superior.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  isSidebarOpen,
  onToggleSidebar,
}) => {
  const location = useLocation();
  const { user } = useAuth() as any;
  const { rolePath, goTo } = useRoleNavigation();
  const [badgeCount, setBadgeCount] = useState(0);

  // Escuchar actualizaciones del conteo de badges de acciones rápidas
  useEffect(() => {
    const handleBadgeUpdate = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail?.count === 'number') {
        setBadgeCount(detail.count);
      }
    };
    window.addEventListener('quick-actions-badge-updated', handleBadgeUpdate);
    return () => window.removeEventListener('quick-actions-badge-updated', handleBadgeUpdate);
  }, []);

  const isCampesino = user?.role === 'Campesino';
  const dashboardPath = useMemo(() => {
    if (isCampesino) return '/campesino';
    return rolePath('/admin/dashboard');
  }, [isCampesino, rolePath]);

  const animalsPath = useMemo(() => rolePath('/admin/animals'), [rolePath]);
  const fieldsPath = useMemo(() => rolePath('/admin/fields'), [rolePath]);

  const currentPath = location.pathname;
  const isDashboardActive =
    currentPath === dashboardPath ||
    currentPath === '/admin' ||
    currentPath === '/campesino' ||
    currentPath.endsWith('/dashboard');
  const isAnimalsActive = currentPath.includes('/animals');
  const isFieldsActive = currentPath.includes('/fields');

  const handleNavigate = (path: string) => {
    if (isSidebarOpen) {
      onToggleSidebar();
    }
    goTo(path);
  };

  const handleTriggerQuickActions = () => {
    if (isSidebarOpen) {
      onToggleSidebar();
    }
    window.dispatchEvent(new CustomEvent('toggle-quick-actions'));
  };

  return (
    <nav
      role="navigation"
      aria-label="Navegación móvil principal"
      className={cn(
        'fixed bottom-0 inset-x-0 z-[1040] md:hidden print:hidden',
        'bg-card/92 backdrop-blur-xl border-t border-border/40',
        'shadow-[0_-4px_25px_rgba(0,0,0,0.08)]',
        'pb-[env(safe-area-inset-bottom,0px)]'
      )}
    >
      <div className="flex h-14 items-center justify-around px-1">
        {/* 1. Inicio */}
        <button
          type="button"
          onClick={() => handleNavigate(dashboardPath)}
          onMouseEnter={() => prefetchRoleRoutes(user?.role)}
          onTouchStart={() => prefetchRoleRoutes(user?.role)}
          className={cn(
            'flex flex-1 min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95',
            isDashboardActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Ir a Inicio"
          aria-current={isDashboardActive ? 'page' : undefined}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[11px] leading-tight">Inicio</span>
        </button>

        {/* 2. Ganado */}
        <button
          type="button"
          onClick={() => handleNavigate(animalsPath)}
          onMouseEnter={() => prefetchRouteByPath('animals')}
          onTouchStart={() => prefetchRouteByPath('animals')}
          className={cn(
            'flex flex-1 min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95',
            isAnimalsActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Ir a Ganado"
          aria-current={isAnimalsActive ? 'page' : undefined}
        >
          <IconCow size={20} />
          <span className="text-[11px] leading-tight">Ganado</span>
        </button>

        {/* 3. Botón Central: Acciones Rápidas */}
        <button
          id="mobile-bottom-nav-actions"
          type="button"
          onClick={handleTriggerQuickActions}
          className="relative -top-2.5 flex flex-1 flex-col items-center justify-center focus:outline-none group"
          aria-label="Acciones rápidas de la finca"
        >
          <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/30 border-2 border-card active:scale-90 transition-transform">
            <Zap className="h-5 w-5 fill-white" />
            {badgeCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[11px] font-black h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-card shadow-sm animate-bounce">
                {badgeCount > 99 ? '99+' : badgeCount}
              </span>
            )}
          </div>
          <span className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            Acción
          </span>
        </button>

        {/* 4. Potreros */}
        <button
          type="button"
          onClick={() => handleNavigate(fieldsPath)}
          onMouseEnter={() => prefetchRouteByPath('fields')}
          onTouchStart={() => prefetchRouteByPath('fields')}
          className={cn(
            'flex flex-1 min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95',
            isFieldsActive
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label="Ir a Potreros"
          aria-current={isFieldsActive ? 'page' : undefined}
        >
          <IconFence size={20} />
          <span className="text-[11px] leading-tight">Potreros</span>
        </button>

        {/* 5. Menú Lateral Completo */}
        <button
          type="button"
          onClick={onToggleSidebar}
          className={cn(
            'flex flex-1 min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-xl transition-all duration-150 active:scale-95',
            isSidebarOpen
              ? 'text-primary font-bold'
              : 'text-muted-foreground hover:text-foreground'
          )}
          aria-label={isSidebarOpen ? 'Cerrar menú' : 'Abrir menú de navegación'}
          aria-expanded={isSidebarOpen}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          <span className="text-[11px] leading-tight">Menú</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
