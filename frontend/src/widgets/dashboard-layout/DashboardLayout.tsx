import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { ChatWidget } from '@/widgets/chat/ChatWidget';
import { FloatingQuickActions } from '@/widgets/dashboard/FloatingQuickActions';
import { QuickActionsModal } from '@/widgets/dashboard-layout/QuickActionsModal';
import { CrearFincaPage } from '@/features/multi-finca/ui/CrearFincaPage';
import { cn } from '@/shared/lib/utils';

// Ancho reservado por el menú lateral flotante: 280px de panel + 16px de gap izquierdo.
const SIDEBAR_INSET = '296px';

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showSidebar = isAuthenticated && !!user?.finca_id;
  const isChatPage = pathname === '/chat';

  useEffect(() => {
    // En pantallas grandes (≥1024px), dejamos el menú principal desplegado por defecto
    const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (isLargeScreen && showSidebar) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [showSidebar]);

  useEffect(() => {
    // Al pasar de escritorio a móvil, el drawer no debe quedarse cubriendo la vista.
    const closeSidebarOnMobile = () => {
      if (window.innerWidth < 1024) setIsSidebarOpen(false);
    };

    window.addEventListener('resize', closeSidebarOnMobile);
    return () => window.removeEventListener('resize', closeSidebarOnMobile);
  }, []);

  /*
    Publicamos la geometría del menú lateral como variables CSS globales para que las
    barras flotantes que se renderizan por portal en document.body (barra de acciones
    masivas, etc.) no queden debajo del menú:
      --app-content-left    espacio a reservar a la izquierda en escritorio.
      --app-floating-opacity / --app-floating-events
                            en móvil el menú es un cajón que cubre el ancho útil,
                            así que las barras flotantes se ocultan mientras está abierto.
  */
  useEffect(() => {
    const root = document.documentElement;

    const applyLayoutVars = () => {
      const isDesktop = window.innerWidth >= 1024;
      const open = showSidebar && isSidebarOpen;
      const drawerOpen = open && !isDesktop;

      root.style.setProperty('--app-content-left', open && isDesktop ? SIDEBAR_INSET : '0px');
      root.style.setProperty('--app-floating-opacity', drawerOpen ? '0' : '1');
      root.style.setProperty('--app-floating-events', drawerOpen ? 'none' : 'auto');
    };

    applyLayoutVars();
    window.addEventListener('resize', applyLayoutVars);
    return () => {
      window.removeEventListener('resize', applyLayoutVars);
      root.style.removeProperty('--app-content-left');
      root.style.removeProperty('--app-floating-opacity');
      root.style.removeProperty('--app-floating-events');
    };
  }, [isSidebarOpen, showSidebar]);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

      {/*
        MENÚ LATERAL FLOTANTE PREMIUM
        Es un panel de estilo glassmorphism que flota sobre el contenido sin interrumpir el flujo.
        Se posiciona de forma fija justo debajo del Header, dejando espacio para respirar.
      */}
      {showSidebar && (
        <div
          aria-hidden={!isSidebarOpen}
          className={cn(
            'fixed z-[1050] transition-all duration-500 ease-out',
            // Posicionamiento flotante con gaps elegantes
            'top-[64px] sm:top-[72px] bottom-4 left-2 sm:left-4 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden',
            // Estado abierto/cerrado deslizándose y desvaneciéndose suavemente
            isSidebarOpen
              ? 'w-[min(280px,calc(100vw-1rem))] translate-x-0 opacity-100 visible'
              : '-translate-x-[340px] w-[min(280px,calc(100vw-1rem))] opacity-0 invisible pointer-events-none'
          )}
        >
          <RoleBasedSideBar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isCollapsed={false}
          />
        </div>
      )}

      {/* Overlay oscuro — SÓLO en móviles y tablets (<1024px) para permitir interactividad continua en escritorio */}
      {showSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ÁREA DE CONTENIDO — Ocupa siempre todo el espacio disponible */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden w-full">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main
          className={cn(
            "flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden bg-background transition-all duration-500 ease-out w-full max-w-full",
            // Con el menú abierto reservamos exactamente el ancho del menú + su margen (296px).
            // Las páginas internas (AppLayout, etc) se encargarán de sus propios paddings.
            isSidebarOpen && "lg:pl-[296px]"
          )}
        >
          <Outlet />
        </main>
      </div>

      {showSidebar && !isChatPage && <FloatingQuickActions />}
      {showSidebar && <ChatWidget hideToggleButton={true} />}
      {showSidebar && <QuickActionsModal />}
      {isAuthenticated && <CrearFincaPage modal />}
    </div>
  );
};

export default DashboardLayout;
