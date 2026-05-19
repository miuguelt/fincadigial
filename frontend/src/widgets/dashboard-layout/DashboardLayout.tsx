import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { ChatWidget } from '@/widgets/chat/ChatWidget';
import { FloatingQuickActions } from '@/widgets/dashboard/FloatingQuickActions';
import { cn } from '@/shared/lib/utils';

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const width = window.innerWidth;
    if (width >= 1024) return 'desktop';
    if (width >= 768) return 'tablet';
    return 'mobile';
  });

  useEffect(() => {
    const onResize = () => {
      const width = window.innerWidth;
      let newViewport: 'desktop' | 'tablet' | 'mobile' = 'mobile';
      if (width >= 1024) newViewport = 'desktop';
      else if (width >= 768) newViewport = 'tablet';

      setViewport(newViewport);
      
      // Ajuste automático por breakpoint
      if (newViewport === 'desktop') {
        setIsSidebarOpen(true);
      } else if (newViewport === 'tablet') {
        setIsSidebarOpen(true); // Siempre visible pero colapsado
      } else {
        setIsSidebarOpen(false); // Oculto por defecto en móvil
      }
    };

    // Inicialización del estado correcto al montar
    onResize();

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

      {/*
        SIDEBAR WRAPPER — Responsable del posicionamiento responsivo por breakpoint.
        Desktop: flex fijo a 240px de ancho.
        Tablet:  flex colapsado fijo a 64px de ancho.
        Móvil:   overlay lateral flotante a 240px (se desliza con translate-x).
      */}
      <div
        aria-hidden={viewport === 'mobile' ? !isSidebarOpen : false}
        className={cn(
          'transition-all duration-300 ease-in-out h-full z-50',
          viewport === 'desktop' && (isSidebarOpen ? 'relative flex-shrink-0 w-[240px]' : 'relative flex-shrink-0 w-0 overflow-hidden invisible'),
          viewport === 'tablet' && 'relative flex-shrink-0 w-[64px]',
          viewport === 'mobile' && [
            'fixed inset-y-0 left-0 w-[240px] shadow-2xl',
            isSidebarOpen ? 'translate-x-0 visible' : '-translate-x-full invisible',
          ].join(' ')
        )}
      >
        <RoleBasedSideBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          isCollapsed={viewport === 'tablet'}
        />
      </div>

      {/* Overlay oscuro — sólo en móvil con sidebar abierto */}
      {viewport === 'mobile' && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ÁREA DE CONTENIDO */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background/50 px-2 sm:px-4 lg:px-6 py-2 sm:py-4 pb-24 sm:pb-20">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
      <FloatingQuickActions />
    </div>
  );
};

export default DashboardLayout;
