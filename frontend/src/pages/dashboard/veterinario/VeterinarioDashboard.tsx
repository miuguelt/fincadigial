import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  Syringe, 
  Pill, 
  AlertTriangle,
  ClipboardList,
  Activity,
  HeartPulse,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { LiveStats } from '@/widgets/dashboard/LiveStats';
import { AIInsightsWidget } from '@/widgets/dashboard/AIInsightsWidget';
import { useCompleteDashboardStats } from '@/features/dashboard/model/useCompleteDashboardStats';
import AlertsPanel from '@/widgets/analytics/AlertsPanel';
import QuickActionCards from '@/widgets/mobile/QuickActionCards';
import GlobalCalendarWidget from '@/widgets/analytics/GlobalCalendarWidget';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
  description: string;
}

export default function VeterinarioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOnline, pendingOperations } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState('acciones');

  const quickActions: QuickAction[] = [
    {
      id: 'nueva-vacuna',
      label: 'Nueva Vacunación',
      icon: <Syringe className="h-6 w-6" />,
      path: '/admin/vaccinations/create',
      color: 'bg-info-500 hover:bg-info-600',
      description: 'Registrar vacunación a animal',
    },
    {
      id: 'nuevo-tratamiento',
      label: 'Nuevo Tratamiento',
      icon: <Pill className="h-6 w-6" />,
      path: '/admin/treatments/create',
      color: 'bg-success-600 hover:bg-success-700',
      description: 'Crear tratamiento médico',
    },
    {
      id: 'diagnostico',
      label: 'Nuevo Diagnóstico',
      icon: <Activity className="h-6 w-6" />,
      path: '/admin/disease-animals/create',
      color: 'bg-danger-600 hover:bg-danger-700',
      description: 'Registrar enfermedad/diagnóstico',
    },
    {
      id: 'ver-animales',
      label: 'Ver Animales',
      icon: <ClipboardList className="h-6 w-6" />,
      path: '/admin/animals',
      color: 'bg-primary hover:bg-primary/80',
      description: 'Lista de animales de la finca',
    },
  ];

  const { stats, loading: statsLoading } = useCompleteDashboardStats();

  // Helper para obtener valores de estadísticas con safe access
  const getStatValue = (stat: any) => stat?.valor ?? 0;

  const healthModules = [
    {
      title: 'Vacunaciones',
      path: '/admin/vaccinations',
      icon: <Syringe className="h-5 w-5" />,
      count: statsLoading ? '...' : `${getStatValue(stats?.vacunas_aplicadas)} aplicadas`,
      color: 'text-blue-600',
    },
    {
      title: 'Tratamientos',
      path: '/admin/treatments',
      icon: <Pill className="h-5 w-5" />,
      count: statsLoading ? '...' : `${getStatValue(stats?.tratamientos_activos)} activos`,
      color: 'text-green-600',
    },
    {
      title: 'Enfermedades',
      path: '/admin/disease-animals',
      icon: <AlertTriangle className="h-5 w-5" />,
      count: statsLoading ? '...' : `${getStatValue(stats?.catalogo_enfermedades)} en catálogo`,
      color: 'text-red-600',
    },
    {
      title: 'Controles',
      path: '/admin/controls',
      icon: <HeartPulse className="h-5 w-5" />,
      count: statsLoading ? '...' : `${getStatValue(stats?.controles_realizados)} realizados`,
      color: 'text-orange-600',
    },
  ];

  const handleAction = (action: QuickAction) => {
    if (!isOnline) {
      showToast('Las operaciones de escritura requieren conexión. Se guardará en cola offline.', 'warning');
    }
    navigate(action.path);
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de Veterinario
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, Dr./Dra. {user?.fullname}. Finca: {user?.finca_name || 'No asignada'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge className={getStatusBadgeClass(isOnline ? 'success' : 'danger')}>
            {isOnline ? (
              <><Wifi className="h-3 w-3 mr-1" /> En línea</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Sin conexión</>
            )}
          </Badge>
          
          {pendingOperations > 0 && (
            <Badge className={getStatusBadgeClass('warning')}>
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              {pendingOperations} pendiente(s)
            </Badge>
          )}
        </div>
      </div>

      {/* KPIs en tiempo real */}
      <LiveStats />

      {/* Asistente IA Ganadero */}
      <AIInsightsWidget />

      {/* Accesos rápidos optimizados para campo */}
      <section>
        <h2 className="text-lg font-bold mb-2 flex items-center gap-2">
          <Activity className="h-5 w-5 text-green-600" />
          Acciones Rápidas (Campo)
        </h2>
        <QuickActionCards />
      </section>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="acciones">Acciones</TabsTrigger>
          <TabsTrigger value="modulos">Módulos Salud</TabsTrigger>
          <TabsTrigger value="alertas">Alertas</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="acciones" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAction(action)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg text-white ${action.color}`}>
                      {action.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{action.label}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {action.description}
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Alerta de modo offline */}
          {!isOnline && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">
                      Modo Sin Conexión
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Los registros se guardarán localmente y se sincronizarán 
                      al recuperar conexión.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="modulos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {healthModules.map((module) => (
              <Card 
                key={module.title}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(module.path)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg bg-gray-100 ${module.color}`}>
                      {module.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{module.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Ver {module.count.toLowerCase()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      Ver →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-6">
            <GlobalCalendarWidget />
          </div>
        </TabsContent>

        <TabsContent value="alertas" className="space-y-4">
          <AlertsPanel />
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información del Veterinario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nombre</label>
                  <p className="text-gray-900">{user?.fullname}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Identificación</label>
                  <p className="text-gray-900">{user?.identification}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Rol</label>
                  <p className="text-gray-900">{user?.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Finca</label>
                  <p className="text-gray-900">{user?.finca_name || 'No asignada'}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-gray-900 mb-2">Permisos del Rol Veterinario</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Ver todos los animales
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Crear vacunaciones
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Crear tratamientos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Registrar diagnósticos de enfermedades
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Crear controles sanitarios
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    No puede modificar registros existentes
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    No puede ver usuarios ni gestión de finca
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Iconos auxiliares
function Check({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
