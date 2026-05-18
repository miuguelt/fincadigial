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
  Scale, 
  MapPin, 
  ClipboardList, 
  History,
  Plus,
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  X
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
      color: 'bg-info-500 hover:bg-info-600',
    },
    {
      id: 'traslado',
      label: 'Trasladar Animal',
      icon: <MapPin className="h-6 w-6" />,
      path: '/quick/transfer',
      color: 'bg-success-600 hover:bg-success-700',
    },
    {
      id: 'enfermedad',
      label: 'Registrar Enfermedad',
      icon: <History className="h-6 w-6" />,
      path: '/quick/disease',
      color: 'bg-danger-600 hover:bg-danger-700',
    },
    {
      id: 'tratamiento',
      label: 'Registrar Tratamiento',
      icon: <ClipboardList className="h-6 w-6" />,
      path: '/quick/treatment',
      color: 'bg-primary hover:bg-primary/80',
    },
  ];

  const handleAction = (action: QuickAction) => {
    if (!isOnline && action.id !== 'ver-animales') {
      showToast('Las operaciones de escritura requieren conexión. Se guardará en cola offline.', 'warning');
    }
    navigate(action.path);
  };

  return (
    <div className="w-full p-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Panel de Operario
          </h1>
          <p className="text-muted-foreground">
            Bienvenido, {user?.fullname}. Finca: {user?.finca_name || 'No asignada'}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Estado de conexión */}
          <Badge className={getStatusBadgeClass(isOnline ? 'success' : 'danger')}>
            {isOnline ? (
              <><Wifi className="h-3 w-3 mr-1" /> En línea</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Sin conexión</>
            )}
          </Badge>
          
          {/* Operaciones pendientes */}
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
                      <h3 className="font-semibold text-foreground">{action.label}</h3>
                      <p className="text-sm text-muted-foreground">
                        Click para acceder
                      </p>
                    </div>
                    <Plus className="h-5 w-5 text-muted-foreground ml-auto" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Instrucciones offline */}
          {!isOnline && (
            <Card className="bg-warning/10 border-warning/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <WifiOff className="h-5 w-5 text-warning mt-0.5" />
                  <div>
                    <h4 className="font-bold text-warning-foreground">
                      Modo Sin Conexión Activo
                    </h4>
                    <p className="text-sm text-warning-foreground mt-1">
                      Tus registros se guardarán localmente y se sincronizarán 
                      automáticamente cuando recuperes conexión.
                    </p>
                    {pendingOperations > 0 && (
                      <p className="text-sm text-warning-foreground mt-2 font-bold">
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
                  <label className="text-sm font-medium text-muted-foreground">Nombre</label>
                  <p className="text-foreground">{user?.fullname}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Identificación</label>
                  <p className="text-foreground">{user?.identification}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Rol</label>
                  <p className="text-foreground">{user?.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Finca</label>
                  <p className="text-foreground">{user?.finca_name || 'No asignada'}</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium text-foreground mb-2">Permisos del Rol Operario</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Ver animales y potreros
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Registrar controles y pesajes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    Registrar traslados de animales
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-danger" />
                    No puede modificar ni eliminar registros
                  </li>
                  <li className="flex items-center gap-2">
                    <X className="h-4 w-4 text-danger" />
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
