import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import {
  ChartBarIcon,
  MapIcon,
  DocumentChartBarIcon,
  ArrowTrendingUpIcon,
  HeartIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { MeshMonitor } from '@/widgets/dashboard/MeshMonitor';
import { WorkerMap } from '@/widgets/dashboard/WorkerMap';
import { AppSharePortal } from '@/widgets/dashboard/AppSharePortal';
import { ConflictLogWidget } from '@/widgets/dashboard/ConflictLogWidget';
import { ExecutiveIntelligence } from '@/widgets/dashboard/ExecutiveIntelligence';
import DailyFarmGuide from '@/widgets/dashboard/DailyFarmGuide';
import UpcomingEventsPanel from '@/widgets/dashboard/UpcomingEventsPanel';

/**
 * Página de inicio del Dashboard Administrativo
 * Muestra cards de acceso rápido a las diferentes secciones de analytics
 */
const AdminDashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { useDashboard } = useAnalytics();
  const { data: dashboardStats, isLoading } = useDashboard();

  const analyticsCards = [
    {
      title: 'Dashboard Ejecutivo',
      description: 'Vista completa de métricas, KPIs, gráficos y alertas del sistema',
      icon: ChartBarIcon,
      path: '/dashboard/admin/analytics/executive',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      stats: dashboardStats ? {
        primary: `${dashboardStats.animales_registrados?.valor || 0} Animales`,
        secondary: `${dashboardStats.alertas_sistema?.valor || 0} Alertas`
      } : null
    },
    {
      title: 'Análisis de Potreros',
      description: 'Ocupación, capacidad y distribución de animales en campos',
      icon: MapIcon,
      path: '/dashboard/admin/analytics/fields',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      stats: dashboardStats ? {
        primary: `${dashboardStats.campos_registrados?.valor || 0} Campos`,
        secondary: 'Ver distribución'
      } : null
    },
    {
      title: 'Reportes Personalizados',
      description: 'Genera reportes customizados de salud, producción e inventario',
      icon: DocumentChartBarIcon,
      path: '/dashboard/admin/analytics/reports',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      stats: null
    }
  ];

  const quickStats = [
    {
      label: 'Animales Activos',
      value: dashboardStats?.animales_activos?.valor || 0,
      icon: HeartIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      label: 'Tratamientos Activos',
      value: dashboardStats?.tratamientos_activos?.valor || 0,
      icon: ArrowTrendingUpIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Personal Registrado',
      value: dashboardStats?.usuarios_registrados?.valor || 0,
      icon: UserGroupIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-full bg-background p-4 sm:p-8 space-y-10">
      {/* Header con diseño premium */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-background to-background border border-border p-8 shadow-sm">
        <div className="relative z-10">
          <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight mb-2">
            Panel de Administración
          </h1>
          <p className="text-text-secondary max-w-2xl leading-relaxed">
            Gestión integral de Villa Luz. Monitorea el rendimiento de tus fincas, analiza métricas clave y coordina tu equipo desde un solo lugar.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
      </div>

      {/* Panel de Inteligencia Ejecutiva (IA & Mesh) */}
      <ExecutiveIntelligence />

      {/* Guía del Día + Próximos Eventos — lado a lado en desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyFarmGuide />
        <UpcomingEventsPanel />
      </div>

      {/* Quick Stats con diseño moderno */}
      {!isLoading && dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="group relative overflow-hidden bg-surface border border-border rounded-2xl p-6 transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-1 opacity-70">{stat.label}</p>
                    <p className={`text-4xl font-black ${stat.color} tracking-tighter`}>{stat.value}</p>
                  </div>
                  <div className={`p-4 rounded-2xl ${stat.bgColor} ${stat.color} transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    <Icon className="w-8 h-8" />
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Cards con Gradients Premium */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <div className="w-2 h-6 bg-primary rounded-full" />
          Inteligencia de Negocio
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {analyticsCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <button
                key={index}
                onClick={() => navigate(card.path)}
                className={`group relative overflow-hidden h-64 ${card.color} text-white rounded-3xl p-8 text-left transition-all hover:shadow-2xl hover:scale-[1.02] active:scale-95`}
              >
                {/* Overlay de brillo */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col h-full justify-between">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                      <Icon className="w-8 h-8" />
                    </div>
                    {card.stats && !isLoading && (
                      <div className="text-right px-4 py-2 bg-black/10 backdrop-blur-sm rounded-2xl border border-white/10">
                        <p className="text-sm font-bold">{card.stats.primary}</p>
                        <p className="text-[10px] uppercase tracking-widest opacity-70">{card.stats.secondary}</p>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-2xl font-black mb-2 leading-tight">{card.title}</h3>
                    <p className="text-sm opacity-80 line-clamp-2 mb-4">{card.description}</p>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                      <span>Explorar Módulo</span>
                      <div className="h-4 w-4 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-2">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Infraestructura de Campo y Conectividad */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <div className="w-2 h-6 bg-amber-500 rounded-full" />
          Herramientas de Conectividad (Mesh)
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <MeshMonitor />
          <AppSharePortal />
          <ConflictLogWidget />
        </div>
      </div>

      {/* Mapa de Operaciones en Tiempo Real */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
          <div className="w-2 h-6 bg-green-600 rounded-full" />
          Mapa de Personal y Cobertura
        </h2>
        <WorkerMap />
      </div>

      {/* Gestión Rápida con Cards Compactas */}
      <div className="bg-surface border border-border rounded-3xl p-8 shadow-sm">
        <h2 className="text-xl font-bold text-text-primary mb-6">Accesos de Gestión</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <button
            onClick={() => navigate('/dashboard/admin/users')}
            className="group p-6 bg-background border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-transform group-hover:scale-110">
              <UserGroupIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">Personal</span>
          </button>
          
          <button
            onClick={() => navigate('/dashboard/admin/fincas')}
            className="group p-6 bg-background border border-border rounded-2xl hover:border-primary hover:bg-primary/5 transition-all text-center"
          >
            <div className="w-12 h-12 mx-auto mb-3 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-transform group-hover:scale-110">
              <MapIcon className="w-6 h-6" />
            </div>
            <span className="text-sm font-bold text-text-primary">Fincas</span>
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-xl">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="text-gray-700">Cargando estadísticas...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardOverview;
