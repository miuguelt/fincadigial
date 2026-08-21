import React, { useState } from 'react';
import { useAnalytics } from '@/features/reporting/model/useAnalytics';
import {
  BarChart3,
  Map,
  TrendingUp,
  Heart,
  Users,
  Wifi,
  Smartphone,
  ShieldAlert,
  Stethoscope,
  Loader2,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { MCPStatusIndicator } from '@/widgets/dashboard/MCPStatusWidget';
import { DashboardSkeleton } from '@/widgets/dashboard/DashboardSkeleton';
import { AdminOverviewTab } from './overview/AdminOverviewTab';
import { AdminAnalyticsTab } from './overview/AdminAnalyticsTab';
import { AdminMeshTab } from './overview/AdminMeshTab';
import { AdminFieldTab } from './overview/AdminFieldTab';

/**
 * Página de inicio del Dashboard Administrativo
 * Rediseñado con arquitectura Bento Grid y KPIs sanitarios en primer viewport.
 */
const AdminDashboardOverview: React.FC = () => {
  const { useDashboard } = useAnalytics();
  const { data: dashboardStats, isLoading, isFetching } = useDashboard();
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'mesh' | 'field'>('overview');

  // Si está cargando y no hay datos en caché, mostrar esqueleto fluido
  if (isLoading && !dashboardStats) {
    return <DashboardSkeleton />;
  }

  const criticalAlertsCount = Number(dashboardStats?.alertas_sistema?.valor || 0);

  const quickStats = [
    {
      label: 'Ganado Activo',
      value: dashboardStats?.animales_activos?.valor ?? dashboardStats?.animales_registrados?.valor ?? 0,
      sub: `${dashboardStats?.animales_registrados?.valor || 0} en hato`,
      icon: Heart,
      color: 'text-success',
      bgColor: 'bg-success/10 border-success/20'
    },
    {
      label: 'Sanidad & Alertas',
      value: criticalAlertsCount,
      sub: criticalAlertsCount > 0 ? 'Requiere atención' : 'Hato saludable',
      icon: ShieldAlert,
      color: criticalAlertsCount > 0 ? 'text-destructive' : 'text-success',
      bgColor: criticalAlertsCount > 0 ? 'bg-destructive/10 border-destructive/20' : 'bg-success/10 border-success/20'
    },
    {
      label: 'Trat. Activos',
      value: dashboardStats?.tratamientos_activos?.valor ?? 0,
      sub: 'En seguimiento',
      icon: Stethoscope,
      color: 'text-info',
      bgColor: 'bg-info/10 border-info/20'
    },
    {
      label: 'Potreros',
      value: dashboardStats?.campos_registrados?.valor ?? 0,
      sub: 'Capacidad activa',
      icon: Map,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20'
    },
    {
      label: 'Personal',
      value: dashboardStats?.usuarios_registrados?.valor ?? 0,
      sub: 'Usuarios en finca',
      icon: Users,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10 border-purple-500/20'
    }
  ];

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-x-hidden">
      {/* Header Premium con Stats Integrados */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-card to-background border border-border/80 shadow-sm">
        <div className="p-5 sm:p-7 relative z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-text-primary tracking-tight">
                Panel de Administración
              </h1>
              <MCPStatusIndicator />
              {isFetching && !isLoading && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Sincronizando
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm sm:text-base max-w-xl leading-relaxed">
              Gestión integral de Villa Luz. Monitoreo sanitario en tiempo real, alertas de hato y coordinación operativa.
            </p>
          </div>

          {/* Quick Stats Compactos en el Header (Primer Viewport Garantizado) */}
          {dashboardStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 w-full xl:w-auto">
              {quickStats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={index}
                    className="flex flex-col justify-between p-3 sm:p-3.5 bg-surface/90 backdrop-blur-md rounded-xl border border-border/70 hover:border-primary/40 hover:shadow-md transition-all duration-200"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-text-secondary line-clamp-1">
                        {stat.label}
                      </span>
                      <div className={`p-1.5 rounded-lg border ${stat.bgColor} ${stat.color} flex-shrink-0`}>
                        <Icon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                    </div>
                    <div>
                      <p className={`text-xl sm:text-2xl font-black ${stat.color} leading-none tracking-tight`}>
                        {typeof stat.value === 'number' ? stat.value.toLocaleString('es-CO') : stat.value}
                      </p>
                      {stat.sub && (
                        <p className="text-[11px] sm:text-xs font-medium text-muted-foreground mt-1 line-clamp-1">
                          {stat.sub}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
      </div>

      {/* Tabs Navigation para Móviles y Escritorio */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-2 pt-1 border-b border-border/50 overflow-x-auto hide-scrollbar">
        <div className="flex space-x-2 sm:space-x-3 w-max min-w-full relative">
          <button
            onClick={() => setActiveTab('overview')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap min-h-[44px] ${
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
            Resumen Operativo
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap min-h-[44px] ${
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
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap min-h-[44px] ${
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
            className={`relative flex items-center px-4 py-2.5 rounded-full text-sm font-bold transition-all duration-300 whitespace-nowrap min-h-[44px] ${
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
            Operaciones sin conexión
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="pt-2 pb-10">
        {activeTab === 'overview' && <AdminOverviewTab />}
        {activeTab === 'analytics' && <AdminAnalyticsTab dashboardStats={dashboardStats} isLoading={isLoading} />}
        {activeTab === 'mesh' && <AdminMeshTab />}
        {activeTab === 'field' && <AdminFieldTab />}
      </div>

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
