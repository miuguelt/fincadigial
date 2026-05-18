import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { 
  Scale, 
  MapPin, 
  ClipboardList, 
  History,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { LiveStats } from '@/widgets/dashboard/LiveStats';
import { AIInsightsWidget } from '@/widgets/dashboard/AIInsightsWidget';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function OperarioDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { isOnline, pendingOperations } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState('acciones');

  const quickActions: QuickAction[] = [
    {
      id: 'nuevo-control',
      label: 'Nuevo Control/Pesaje',
      icon: <Scale className="h-6 w-6" />,
      path: '/quick/control',
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      id: 'traslado',
      label: 'Trasladar Animal',
      icon: <MapPin className="h-6 w-6" />,
      path: '/quick/transfer',
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      id: 'enfermedad',
      label: 'Registrar Enfermedad',
      icon: <History className="h-6 w-6" />,
      path: '/quick/disease',
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      id: 'tratamiento',
      label: 'Registrar Tratamiento',
      icon: <ClipboardList className="h-6 w-6" />,
      path: '/quick/treatment',
      color: 'bg-purple-500 hover:bg-purple-600',
    },
  ];

  const handleAction = (action: QuickAction) => {
    if (!isOnline && action.id !== 'ver-animales') {
      showToast('Las operaciones de escritura requieren conexión. Se guardará en cola offline.', 'warning');
    }
    navigate(action.path);
  };

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de Operario
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.fullname}. Finca: {user?.finca_name || 'No asignada'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Estado de conexión */}
          <Badge 
            variant={isOnline ? 'default' : 'secondary'}
            className={isOnline ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
          >
            {isOnline ? (
              <><Wifi className="h-3 w-3 mr-1" /> En línea</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Sin conexión</>
            )}
          </Badge>
          
          {/* Operaciones pendientes */}
          {pendingOperations > 0 && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              {pendingOperations} pendiente(s)
            </Badge>
          )}
        </div>
      </div>

      {/* KPIs en tiempo real */}
      <LiveStats />

      {/* Asistente IA */}
      <AIInsightsWidget />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="acciones">Acciones Rápidas</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="acciones" className="space-y-4">
          {/* Grid de acciones rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickActions.map((action) => (
              <Card 
                key={action.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleAction(action)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg text-white ${action.color}`}>
                      {action.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{action.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        Click para acceder
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-gray-400 ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Instrucciones offline */}
          {!isOnline && (
            <Card className="bg-yellow-50 border-yellow-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">
                      Modo Sin Conexión Activo
                    </h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      Tus registros se guardarán localmente y se sincronizarán 
                      automáticamente cuando recuperes conexión.
                    </p>
                    {pendingOperations > 0 && (
                      <p className="text-sm text-yellow-800 mt-2 font-medium">
                        Tienes {pendingOperations} operación(es) pendiente(s) de sincronizar.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información del Operario</CardTitle>
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
                <h4 className="font-medium text-gray-900 mb-2">Permisos del Rol Operario</h4>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Ver animales y potreros
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Registrar controles y pesajes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    Registrar traslados de animales
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    No puede modificar ni eliminar registros
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-red-500" />
                    No puede ver usuarios
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
