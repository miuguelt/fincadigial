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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { KPICard } from '@/shared/ui/KPICard';
import { MCPStatusIndicator } from '@/widgets/dashboard/MCPStatusWidget';
import { DashboardSkeleton } from '@/widgets/dashboard/DashboardSkeleton';
import { AdminOverviewTab } from './overview/AdminOverviewTab';
import { AdminAnalyticsTab } from './overview/AdminAnalyticsTab';
import { AdminMeshTab } from './overview/AdminMeshTab';
import { AdminFieldTab } from './overview/AdminFieldTab';

/**
 * Página de inicio del Dashboard Administrativo
 * Estandarizado con arquitectura Bento Grid y KPIs sanitarios en primer viewport.
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

  const quickStats: Array<{
    label: string;
    value: string | number;
    sub?: string;
    icon: typeof Heart;
    status: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  }> = [
    {
      label: 'Ganado Activo',
      value: dashboardStats?.animales_activos?.valor ?? dashboardStats?.animales_registrados?.valor ?? 0,
      sub: `${dashboardStats?.animales_registrados?.valor || 0} en el ganado`,
      icon: Heart,
      status: 'success',
    },
    {
      label: 'Sanidad & Alertas',
      value: criticalAlertsCount,
      sub: criticalAlertsCount > 0 ? 'Requiere atención' : 'Ganado saludable',
      icon: ShieldAlert,
      status: criticalAlertsCount > 0 ? 'danger' : 'success',
    },
    {
      label: 'Trat. Activos',
      value: dashboardStats?.tratamientos_activos?.valor ?? 0,
      sub: 'En seguimiento',
      icon: Stethoscope,
      status: 'info',
    },
    {
      label: 'Potreros',
      value: dashboardStats?.campos_registrados?.valor ?? 0,
      sub: 'Capacidad activa',
      icon: Map,
      status: 'success',
    },
    {
      label: 'Personal',
      value: dashboardStats?.usuarios_registrados?.valor ?? 0,
      sub: 'Usuarios en finca',
      icon: Users,
      status: 'info',
    },
  ];

  return (
    <div className="min-h-full w-full bg-background p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Header Institucional con Stats Integrados */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm">
        <div className="p-5 sm:p-7 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight">
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
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl leading-relaxed">
              Gestión integral de Villa Luz. Monitoreo sanitario en tiempo real, alertas del ganado y coordinación operativa.
            </p>
          </div>

          {/* Quick Stats Compactos en el Header (Primer Viewport Garantizado) */}
          {dashboardStats && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 w-full xl:w-auto">
              {quickStats.map((stat, index) => (
                <KPICard
                  key={index}
                  compact
                  label={stat.label}
                  value={stat.value}
                  subtitle={stat.sub}
                  icon={stat.icon}
                  status={stat.status}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs Navigation Estandarizado con UI Kit */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md pb-2 pt-1 border-b border-border/50">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1 sm:grid-cols-4 max-w-2xl">
            <TabsTrigger value="overview" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
              <BarChart3 className="w-4 h-4" />
              Resumen Operativo
            </TabsTrigger>
            <TabsTrigger value="analytics" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
              <TrendingUp className="w-4 h-4" />
              Inteligencia
            </TabsTrigger>
            <TabsTrigger value="mesh" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
              <Wifi className="w-4 h-4" />
              Mesh & Red
            </TabsTrigger>
            <TabsTrigger value="field" className="min-h-11 gap-2 rounded-xl text-xs sm:text-sm font-bold">
              <Smartphone className="w-4 h-4" />
              Operaciones sin conexión
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="pt-4 pb-10">
          <AdminOverviewTab />
        </TabsContent>
        <TabsContent value="analytics" className="pt-4 pb-10">
          <AdminAnalyticsTab dashboardStats={dashboardStats} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="mesh" className="pt-4 pb-10">
          <AdminMeshTab />
        </TabsContent>
        <TabsContent value="field" className="pt-4 pb-10">
          <AdminFieldTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboardOverview;
