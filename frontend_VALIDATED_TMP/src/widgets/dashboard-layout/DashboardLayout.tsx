import React, { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { ChatWidget } from '@/widgets/chat/ChatWidget';

const DESKTOP_BREAKPOINT = 1024;

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= DESKTOP_BREAKPOINT);
  const prevDesktop = useRef(isDesktop);

  useEffect(() => {
    const onResize = () => {
      const desktop = window.innerWidth >= DESKTOP_BREAKPOINT;
      if (desktop !== prevDesktop.current) {
        prevDesktop.current = desktop;
        setIsDesktop(desktop);
        // Abrir sidebar al pasar a desktop, cerrar al pasar a móvil
        setIsSidebarOpen(desktop);
      }
    };

    // Apertura inicial en desktop
    if (isDesktop) setIsSidebarOpen(true);

    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/" replace />;

  return (
    // w-full en vez de w-screen: evita overflow de ~15px por ancho del scrollbar
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">

      {/*
        SIDEBAR WRAPPER — único responsable de posicionamiento y animación.
        Desktop: elemento flex que reserva ancho (280px → 0 al cerrar).
        Móvil:   overlay fixed que no desplaza el contenido principal.

        IMPORTANTE: el <aside> interno ya NO tiene transform/fixed propio.
        Antes ambos tenían translate-x animado → doble-translación = overflow.
      */}
      <div
        aria-hidden={!isSidebarOpen}
        className={[
          'transition-all duration-300 ease-in-out h-full',
          isDesktop
            ? isSidebarOpen
              ? 'relative flex-shrink-0 w-[280px]'
              : 'relative flex-shrink-0 w-0 overflow-hidden'
            : [
                'fixed inset-y-0 left-0 z-50 w-[280px] shadow-2xl',
                isSidebarOpen ? 'translate-x-0' : '-translate-x-full',
              ].join(' '),
        ].join(' ')}
      >
        <RoleBasedSideBar
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
        />
      </div>

      {/* Overlay oscuro — sólo en móvil con sidebar abierto */}
      {!isDesktop && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ÁREA DE CONTENIDO — flex-1 + min-w-0 es obligatorio para evitar flex blowout */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background/50">
          <Outlet />
        </main>
      </div>

      <ChatWidget />
    </div>
  );
};

export default DashboardLayout;
