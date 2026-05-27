import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import {
  BarChart3,
  Map,
  FileText,
  TrendingUp,
  Heart,
  Users,
  Wifi,
  MapPin,
  Smartphone
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MCPStatusIndicator } from '@/widgets/dashboard/MCPStatusWidget';
import { MeshMonitor } from '@/widgets/dashboard/MeshMonitor';
import { WorkerMap } from '@/widgets/dashboard/WorkerMap';
import { AppSharePortal } from '@/widgets/dashboard/AppSharePortal';
import { ConflictLogWidget } from '@/widgets/dashboard/ConflictLogWidget';
import { ExecutiveIntelligence } from '@/widgets/dashboard/ExecutiveIntelligence';
import DailyFarmGuide from '@/widgets/dashboard/DailyFarmGuide';
import UpcomingEventsPanel from '@/widgets/dashboard/UpcomingEventsPanel';
import { FieldReadyWidget } from '@/widgets/dashboard/FieldReadyWidget';
import { VoiceNoteWidget } from '@/widgets/dashboard/VoiceNoteWidget';
import { FastWeightEntry } from '@/widgets/dashboard/FastWeightEntry';

/**
 * Página de inicio del Dashboard Administrativo
 * Rediseñado para facilitar el uso desde celulares y computadoras mediante un sistema de pestañas.
 */
const AdminDashboardOverview: React.FC = () => {
  const navigate = useNavigate();
  const { useDashboard } = useAnalytics();
  const { data: dashboardStats, isLoading } = useDashboard();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'mesh' | 'field'>('overview');

  const analyticsCards = [
    {
      title: 'Dashboard Ejecutivo',
      description: 'Vista completa de métricas, KPIs, gráficos y alertas del sistema',
      icon: BarChart3,
      path: '/admin/analytics/executive',
      color: 'bg-gradient-to-br from-info to-indigo-700 shadow-info-500/10',
      hoverColor: 'hover:shadow-info/30',
      stats: dashboardStats ? {
        primary: `${dashboardStats.animales_registrados?.valor || 0} Animales`,
        secondary: `${dashboardStats.alertas_sistema?.valor || 0} Alertas`
      } : null
    },
    {
      title: 'Análisis de Potreros',
      description: 'Ocupación, capacidad y distribución de animales en campos',
      icon: Map,
      path: '/admin/analytics/fields',
      color: 'bg-gradient-to-br from-success to-teal-700 shadow-success-500/10',
      hoverColor: 'hover:shadow-success/30',
      stats: dashboardStats ? {
        primary: `${dashboardStats.campos_registrados?.valor || 0} Campos`,
        secondary: 'Ver distribución'
      } : null
    },
    {
      title: 'Reportes',
      description: 'Centraliza y genera todos los reportes de tu finca desde un solo lugar',
      icon: FileText,
      path: '/admin/reports',
      color: 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/10',
      hoverColor: 'hover:shadow-purple/30',
      stats: null
    }
  ];

  const quickStats = [
    {
      label: 'Animales Activos',
      value: dashboardStats?.animales_activos?.valor || 0,
      icon: Heart,
      color: 'text-success',
      bgColor: 'bg-success/5'
    },
    {
      label: 'Trat. Activos',
      value: dashboardStats?.tratamientos_activos?.valor || 0,
      icon: TrendingUp,
      color: 'text-info',
      bgColor: 'bg-info/5'
    },
    {
      label: 'Personal',
      value: dashboardStats?.usuarios_registrados?.valor || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    }
  ];

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Premium con Stats Integrados */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/10 via-background to-background border border-border shadow-sm">
        <div className="p-6 sm:p-8 relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-primary tracking-tight">
                Panel de Administración
              </h1>
              <MCPStatusIndicator />
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl leading-relaxed">
              Gestión integral de Villa Luz. Monitorea el rendimiento, analiza métricas y coordina tu equipo rápidamente.
            </p>
          </div>

          {/* Quick Stats Compactos en el Header */}
          {!isLoading && dashboardStats && (
            <div className="flex flex-wrap md:flex-nowrap gap-3 w-full xl:w-auto">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="flex-1 min-w-[120px] flex items-center p-3 sm:p-4 bg-surface/80 backdrop-blur-md rounded-lg border border-border hover:shadow-md transition-shadow">
                    <div className={`p-2.5 sm:p-3 rounded-xl ${stat.bgColor} ${stat.color} mr-3`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-black ${stat.color} leading-none`}>{stat.value}</p>
                      <p className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary opacity-80 mt-1 truncate max-w-[80px] sm:max-w-[100px]">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      </div>

      {/* Tabs Navigation para Móviles y Escritorio */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm pb-2 pt-1 border-b border-border/50 overflow-x-auto hide-scrollbar">
        <div className="flex space-x-2 sm:space-x-4 w-max min-w-full relative">
          <button
            onClick={() => setActiveTab('overview')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'overview'
                ? 'text-primary-foreground z-10'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            {activeTab === 'overview' && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-primary rounded-full shadow-md -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <BarChart3 className="w-4 h-4 mr-2" />
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'text-primary-foreground z-10'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            {activeTab === 'analytics' && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-primary rounded-full shadow-md -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <TrendingUp className="w-4 h-4 mr-2" />
            Inteligencia
          </button>
          <button
            onClick={() => setActiveTab('mesh')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'mesh'
                ? 'text-primary-foreground z-10'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            {activeTab === 'mesh' && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-primary rounded-full shadow-md -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Wifi className="w-4 h-4 mr-2" />
            Mesh & Red
          </button>
          <button
            onClick={() => setActiveTab('field')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap ${
              activeTab === 'field'
                ? 'text-primary-foreground z-10'
                : 'text-text-secondary hover:bg-surface hover:text-text-primary'
            }`}
          >
            {activeTab === 'field' && (
              <motion.div
                layoutId="activeTabBackground"
                className="absolute inset-0 bg-primary rounded-full shadow-md -z-10"
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
              />
            )}
            <Smartphone className="w-4 h-4 mr-2" />
            Operaciones Offline
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2 pb-10">
        
        {/* --- TAB: OVERVIEW --- */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-fade-in">
            {/* Panel de Inteligencia Ejecutiva (IA) */}
            <ExecutiveIntelligence />

            {/* Guía del Día + Próximos Eventos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <DailyFarmGuide />
              <UpcomingEventsPanel />
            </div>

            {/* Accesos de Gestión Rápidos */}
            <div className="bg-surface border border-border rounded-xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center">
                <div className="w-1.5 h-5 bg-primary rounded-full mr-2" />
                Accesos de Gestión
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 sm:gap-4">
                <button
                  onClick={() => navigate('/admin/users')}
                  className="group p-4 bg-background border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center flex flex-col items-center"
                >
                  <div className="w-10 h-10 mb-2 bg-primary/10 rounded-xl flex items-center justify-center text-primary transition-transform group-hover:scale-110">
                    <Users className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Personal</span>
                </button>
                
                <button
                  onClick={() => navigate('/admin/fincas')}
                  className="group p-4 bg-background border border-border rounded-lg hover:border-success hover:bg-success/5 transition-all text-center flex flex-col items-center"
                >
                  <div className="w-10 h-10 mb-2 bg-success/10 rounded-xl flex items-center justify-center text-success transition-transform group-hover:scale-110">
                    <Map className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-text-primary">Fincas</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB: ANALYTICS --- */}
        {activeTab === 'analytics' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-text-primary flex items-center">
              <div className="w-1.5 h-5 bg-primary rounded-full mr-2" />
              Módulos de Inteligencia de Negocio
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {analyticsCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <button
                    key={index}
                    onClick={() => navigate(card.path)}
                    className={`group relative overflow-hidden h-56 sm:h-64 ${card.color} text-white rounded-xl p-6 sm:p-8 text-left transition-all duration-300 shadow-lg hover:shadow-2xl ${card.hoverColor} hover:scale-[1.02] hover:-translate-y-1 active:scale-95 border border-white/10`}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="flex flex-col h-full justify-between">
                      <div className="flex items-start justify-between">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10">
                          <Icon className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        {card.stats && !isLoading && (
                          <div className="text-right px-3 py-1.5 sm:px-4 sm:py-2 bg-black/15 backdrop-blur-md rounded-lg border border-white/10">
                            <p className="text-xs sm:text-sm font-bold">{card.stats.primary}</p>
                            <p className="text-[9px] sm:text-[10px] uppercase tracking-widest opacity-70">{card.stats.secondary}</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-black mb-1 sm:mb-2 leading-tight tracking-tight">{card.title}</h3>
                        <p className="text-xs sm:text-sm opacity-85 line-clamp-2 mb-3 sm:mb-4">{card.description}</p>
                        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold uppercase tracking-widest">
                          <span>Explorar</span>
                          <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
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
        )}

        {/* --- TAB: MESH --- */}
        {activeTab === 'mesh' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-text-primary flex items-center">
              <div className="w-1.5 h-5 bg-warning rounded-full mr-2" />
              Herramientas de Conectividad (Mesh)
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              <MeshMonitor />
              <AppSharePortal />
              <ConflictLogWidget />
            </div>
          </div>
        )}

        {/* --- TAB: FIELD --- */}
        {activeTab === 'field' && (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-text-primary flex items-center">
              <div className="w-1.5 h-5 bg-success rounded-full mr-2" />
              Operaciones Offline & Mapa
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <FieldReadyWidget />
              <VoiceNoteWidget />
              <FastWeightEntry />
            </div>
            
            <div className="pt-4 border-t border-border">
              <h3 className="text-md font-bold text-text-primary mb-4 flex items-center">
                <MapPin className="w-4 h-4 text-info mr-2" />
                Mapa de Personal y Cobertura
              </h3>
              <WorkerMap />
            </div>
          </div>
        )}
        
      </div>

      {/* Loading Overlay Global */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity">
          <div className="bg-card rounded-lg p-6 shadow-2xl flex items-center space-x-4 border border-border">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-info"></div>
            <span className="text-foreground font-semibold">Cargando métricas...</span>
          </div>
        </div>
      )}

      {/* CSS para la animación y scrollbar oculta */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}} />
    </div>
  );
};

export default AdminDashboardOverview;
