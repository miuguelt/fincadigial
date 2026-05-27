import React, { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import RoleBasedSideBar from '@/widgets/dashboard/RoleBasedSideBar';
import Header from './Header';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';
import { ChatWidget } from '@/widgets/chat/ChatWidget';
import { FloatingQuickActions } from '@/widgets/dashboard/FloatingQuickActions';
import { QuickActionsModal } from '@/widgets/dashboard-layout/QuickActionsModal';
import { cn } from '@/shared/lib/utils';

const DashboardLayout: React.FC = () => {
  const { loading, isAuthenticated, user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const showSidebar = isAuthenticated && !!user?.finca_id;

  useEffect(() => {
    // Al montar en pantallas grandes (≥1024px), dejamos el menú flotante abierto por defecto si hay finca
    const isLargeScreen = typeof window !== 'undefined' && window.innerWidth >= 1024;
    if (isLargeScreen && showSidebar) {
      setIsSidebarOpen(true);
    } else {
      setIsSidebarOpen(false);
    }
  }, [showSidebar]);

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
            'top-[68px] sm:top-[80px] bottom-4 left-4 rounded-lg border border-white/20 dark:border-white/5 bg-white/40 dark:bg-black/40 backdrop-blur-3xl shadow-2xl overflow-hidden',
            // Estado abierto/cerrado deslizándose y desvaneciéndose suavemente
            isSidebarOpen
              ? 'w-[280px] translate-x-0 opacity-100 visible'
              : '-translate-x-[340px] w-[280px] opacity-0 invisible pointer-events-none'
          )}
        >
          <RoleBasedSideBar
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            isCollapsed={false} // Siempre expandido al abrirse flotando
          />
        </div>
      )}

      {/* Overlay oscuro y difuminado — SÓLO activo en pantallas móviles y tablets para permitir interactividad en escritorio */}
      {showSidebar && isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/15 backdrop-blur-[2px] animate-in fade-in duration-300 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ÁREA DE CONTENIDO — Ocupa siempre el 100% de la pantalla para aprovechar todo el espacio */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden w-full">
        <Header
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
        <main 
          className={cn(
            "flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-transparent px-2 sm:px-4 lg:px-6 py-2 sm:py-4 pb-0 transition-all duration-500 ease-out",
            isSidebarOpen ? "lg:pl-[312px]" : "lg:pl-0"
          )}
        >
          <Outlet />
        </main>
      </div>

      {showSidebar && <ChatWidget />}
      {showSidebar && <FloatingQuickActions />}
      {showSidebar && <QuickActionsModal />}
    </div>
  );
};

export default DashboardLayout;
