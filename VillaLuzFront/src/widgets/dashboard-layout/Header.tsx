import React, { useMemo } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { Menu, MessageCircle, ShoppingBag, Plus } from 'lucide-react';
import { cn } from '@/shared/ui/cn.ts';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeToggle from '@/widgets/dashboard/ThemeToggle';
import { useUnreadMessages } from '@/features/chat/hooks/useUnreadMessages';
import { NotificationCenter } from '@/shared/components/notifications';
import { SyncStatus } from '@/widgets/dashboard/SyncStatus';
import { Breadcrumbs } from '@/shared/ui/common';

import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/shared/ui/dropdown-menu';
import { Activity, Sprout, Droplet, Heart, QrCode } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ isSidebarOpen, onToggleSidebar }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useUnreadMessages(60000);

  const getRolePrefix = (r: string): string => {
    switch (r) {
      case "Administrador":
      case "Propietario":
      case "Capataz":
        return "/admin";
      case "Instructor":
        return "/instructor";
      case "Veterinario":
        return "/veterinario";
      case "Aprendiz":
        return "/apprentice";
      case "Operario":
        return "/operario";
      default:
        return "/";
    }
  };

  const rolePrefix = getRolePrefix(user?.role || '');
  const animalsPath = rolePrefix === '/' ? '/admin/animals' : `${rolePrefix}/animals`;
  const scannerPath = rolePrefix === '/instructor' ? '/instructor/scanner' : (rolePrefix === '/veterinario' ? '/veterinario/scanner' : '/scanner');

  // Lógica para botón "Nuevo" contextual
  const contextualNewAction = useMemo(() => {
    const path = location.pathname;
    if (path.includes('/animals')) return { label: '+ Registrar Animal', action: () => navigate(`${path}?create=true`) };
    if (path.includes('/fields')) return { label: '+ Agregar Potrero', action: () => navigate(`${path}?create=true`) };
    if (path.includes('/tasks')) return { label: '+ Crear Tarea', action: () => navigate(`${path}?create=true`) };
    return null;
  }, [location.pathname, navigate]);

  return (
    <header className="sticky top-0 z-[1000] w-full h-10 sm:h-16 border-b border-border/30 bg-background/80 backdrop-blur-xl shadow-sm" role="banner">
      <div className="flex h-10 sm:h-16 items-center px-2 sm:px-3 lg:px-4 gap-2">

        {/* IZQUIERDA: Hamburger + Breadcrumbs */}
        <div className="flex items-center gap-2.5 min-w-0">
          {user?.finca_id && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className={cn(
                "flex-shrink-0 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-border/40 bg-surface hover:bg-primary/10 text-foreground transition-all duration-300 shadow-sm",
                isSidebarOpen && "bg-primary/10 text-primary border-primary/20"
              )}
              aria-label={isSidebarOpen ? 'Ocultar menú' : 'Mostrar menú'}
            >
              <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}

          <div className="hidden sm:block">
            <Breadcrumbs />
          </div>
        </div>

        {/* CENTRO: Botón contextual + Nuevo (solo en ciertas páginas y desktop) */}
        {contextualNewAction && (
          <div className="hidden md:flex flex-1 justify-center">
             <button
                onClick={contextualNewAction.action}
                className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-primary text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95"
             >
                <Plus size={16} />
                {contextualNewAction.label}
             </button>
          </div>
        )}

        {/* DERECHA: Compact actions */}
        <div className="flex items-center gap-1 flex-shrink-0 ml-auto">
          {/* SyncStatus - solo xl */}
          {user?.finca_id && (
            <div className="hidden xl:block mr-2">
              <SyncStatus />
            </div>
          )}

          {/* Atajos rápidos */}
          <div className="flex items-center gap-0.5">
            {user?.finca_id && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary"
                    title="Atajos de Finca"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 mt-2 rounded-xl border border-border/40 bg-card/90 backdrop-blur-xl shadow-2xl p-2 z-[1050]">
                  <DropdownMenuLabel className="px-3 py-1.5 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Acciones Rápidas</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate(animalsPath)} className="rounded-lg cursor-pointer py-2 text-sm font-medium">
                    <Activity className="mr-2 h-4 w-4 text-amber-500" />
                    <span>Mis Animales</span>
                  </DropdownMenuItem>
                  
                  <DropdownMenuItem onClick={() => navigate('/campesino')} className="rounded-lg cursor-pointer py-2 text-sm font-medium">
                    <Sprout className="mr-2 h-4 w-4 text-emerald-500" />
                    <span>Mi Huerta</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate(scannerPath)} className="rounded-lg cursor-pointer py-2 text-sm font-medium">
                    <QrCode className="mr-2 h-4 w-4 text-sky-500" />
                    <span>Escáner QR</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem onClick={() => navigate('/quick/milk')} className="rounded-lg cursor-pointer py-2 text-sm font-medium">
                    <Droplet className="mr-2 h-4 w-4 text-blue-500" />
                    <span>Registrar Leche</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={() => navigate('/quick/disease')} className="rounded-lg cursor-pointer py-2 text-sm font-medium">
                    <Heart className="mr-2 h-4 w-4 text-rose-500" />
                    <span>Salud Animal</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <ThemeToggle />
            
            {user?.finca_id && (
              <>
                <NotificationCenter />
                <button
                  onClick={() => navigate('/campesino/market-offers')}
                  className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary"
                  title="Mercado"
                >
                  <ShoppingBag className="h-4 w-4" />
                </button>
                <button
                  onClick={() => navigate('/chat')}
                  className="relative flex h-8 w-8 items-center justify-center rounded-xl hover:bg-primary/10 transition-all"
                  title="Mensajes"
                >
                  <MessageCircle className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center bg-primary text-primary-foreground text-[8px] font-bold rounded-full animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>

          <div className="h-5 w-[1px] bg-border mx-1" />

          {/* Perfil (Solo ícono en header ya que el detalle está en sidebar) */}
          <button 
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center h-8 w-8 rounded-xl bg-gradient-to-tr from-primary to-primary-light text-white font-bold shadow-md hover:scale-105 transition-all overflow-hidden"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.fullname} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs uppercase">{user?.fullname?.[0]}</span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;

