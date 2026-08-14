import { useState } from 'react';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
// import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { getStatusBadgeClass } from '@/shared/utils/badgeStyles';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import {
  IconArrowRight,
  IconCheck,
  IconClipboardList,
  IconHistory,
  IconMapPin,
  IconRefresh,
  IconScale,
  IconWifi,
  IconWifiOff,
  IconX,
} from '@/shared/ui/icons';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { LiveStats } from '@/widgets/dashboard/LiveStats';
import { AIInsightsWidget } from '@/widgets/dashboard/AIInsightsWidget';
import { FincaHeroBanner } from '@/widgets/finca/hero';

import {
  useRegistroOperativo,
  TransferModal,
  DiseaseModal,
  TreatmentModal,
  ControlModal,
} from '@/widgets/registro-operativo';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: typeof IconScale;
  modalKey?: string;
  color: string;
}

export default function OperarioDashboard() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { isOnline, totalOperations } = useOnlineStatus();
  const [activeTab, setActiveTab] = useState('acciones');

  const quickActions: QuickAction[] = [
    {
      id: 'nuevo-control',
      label: 'Registrar control o pesaje',
      description: 'Actualiza peso, condición y seguimiento del animal.',
      icon: IconScale,
      modalKey: 'control',
      color: 'bg-info-600',
    },
    {
      id: 'traslado',
      label: 'Trasladar Animal',
      description: 'Registra el movimiento entre potreros de la finca.',
      icon: IconMapPin,
      modalKey: 'transfer',
      color: 'bg-success-600',
    },
    {
      id: 'enfermedad',
      label: 'Registrar Enfermedad',
      description: 'Reporta síntomas y novedades de salud del ganado.',
      icon: IconHistory,
      modalKey: 'disease',
      color: 'bg-danger-600',
    },
    {
      id: 'tratamiento',
      label: 'Registrar Tratamiento',
      description: 'Deja constancia de medicamentos y procedimientos.',
      icon: IconClipboardList,
      modalKey: 'treatment',
      color: 'bg-primary',
    },
  ];

  const {
    activeModal, savingForm,
    animals, fields, diseases, medications,
    transferForm, setTransferForm,
    diseaseForm, setDiseaseForm, treatmentForm, setTreatmentForm,
    controlForm, setControlForm,
    openModal, closeModal,
    handleTransferSubmit, handleDiseaseSubmit, handleTreatmentSubmit, handleControlSubmit
  } = useRegistroOperativo();

  const handleAction = (action: QuickAction) => {
    if (!isOnline && action.id !== 'ver-animales') {
      showToast('Las operaciones de escritura requieren conexión. Se guardará en cola offline.', 'warning');
    }
    if (action.modalKey) {
      openModal(action.modalKey);
    } else {
      showToast('Módulo en construcción', 'info');
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1600px] space-y-6 px-4 py-5 sm:px-6 sm:py-7 lg:space-y-8 lg:px-8 lg:py-8">
      {/* Header */}
      <section className="flex flex-col gap-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between lg:p-8">
        <div className="min-w-0">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary-700">
            Resumen de la jornada
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Panel de Operario
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            Hola, {user?.fullname}. Consulta el estado de{' '}
            <span className="font-semibold text-foreground">
              {user?.finca_name || 'tu finca asignada'}
            </span>{' '}
            y registra las novedades del día.
          </p>
        </div>
        
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {/* Estado de conexión */}
          <Badge className={`${getStatusBadgeClass(isOnline ? 'success' : 'danger')} px-3 py-1.5 shadow-sm`}>
            {isOnline ? (
              <><IconWifi size="sm" className="mr-1" /> En línea</>
            ) : (
              <><IconWifiOff size="sm" className="mr-1" /> Sin conexión</>
            )}
          </Badge>
          
          {/* Operaciones pendientes */}
          {totalOperations > 0 && (
            <Badge className={getStatusBadgeClass('warning')}>
              <IconRefresh size="sm" className="mr-1 animate-spin" />
              {totalOperations} pendiente(s)
            </Badge>
          )}
        </div>
      </section>

      <FincaHeroBanner />

      {/* KPIs en tiempo real */}
      <LiveStats />

      {/* Asistente IA */}
      <AIInsightsWidget />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid h-12 w-full grid-cols-2 rounded-xl border border-border bg-secondary p-1.5 shadow-sm">
          <TabsTrigger className="rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background" value="acciones">Acciones rápidas</TabsTrigger>
          <TabsTrigger className="rounded-lg data-[state=active]:bg-foreground data-[state=active]:text-background" value="info">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="acciones" className="mt-0 space-y-4">
          <div>
            <h2 className="text-lg font-bold text-foreground sm:text-xl">¿Qué necesitas registrar?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Accede rápidamente a las tareas más frecuentes de campo.</p>
          </div>
          {/* Grid de acciones rápidas */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {quickActions.map((action) => (
              <button
                type="button"
                key={action.id}
                className="group flex min-h-28 w-full items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:p-6"
                onClick={() => handleAction(action)}
              >
                <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${action.color}`}>
                  <action.icon size="lg" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-foreground">{action.label}</span>
                  <span className="mt-1 block text-sm leading-5 text-muted-foreground">{action.description}</span>
                </span>
                <IconArrowRight size="md" className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </button>
            ))}
          </div>

          {/* Instrucciones offline */}
          {!isOnline && (
            <Card premium={false} hoverable={false} className="border-warning-300 bg-warning-50">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <IconWifiOff size="md" className="mt-0.5 text-warning-700" />
                  <div>
                    <h4 className="font-bold text-warning-foreground">
                      Modo sin conexión activo
                    </h4>
                    <p className="text-sm text-warning-foreground mt-1">
                      Tus registros se guardarán localmente y se sincronizarán 
                      automáticamente cuando recuperes conexión.
                    </p>
                    {totalOperations > 0 && (
                      <p className="text-sm text-warning-foreground mt-2 font-bold">
                        Tienes {totalOperations} operación(es) pendiente(s) de sincronizar.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="info" className="mt-0">
          <Card premium={false} hoverable={false} className="shadow-sm">
            <CardHeader className="border-b border-border p-5 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Información del operario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 p-5 sm:p-6">
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
                    <IconCheck size="sm" className="text-success" />
                    Ver animales y potreros
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck size="sm" className="text-success" />
                    Registrar controles y pesajes
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck size="sm" className="text-success" />
                    Registrar traslados de animales
                  </li>
                  <li className="flex items-center gap-2">
                    <IconX size="sm" className="text-danger" />
                    No puede modificar ni eliminar registros
                  </li>
                  <li className="flex items-center gap-2">
                    <IconX size="sm" className="text-danger" />
                    No puede ver usuarios
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Modales Operativos Reutilizados */}
      <TransferModal open={activeModal === 'transfer'} onClose={closeModal} form={transferForm} setForm={setTransferForm} animals={animals} fields={fields} saving={savingForm} onSubmit={handleTransferSubmit} />
      <DiseaseModal open={activeModal === 'disease'} onClose={closeModal} form={diseaseForm} setForm={setDiseaseForm} animals={animals} diseases={diseases} saving={savingForm} onSubmit={handleDiseaseSubmit} />
      <TreatmentModal open={activeModal === 'treatment'} onClose={closeModal} form={treatmentForm} setForm={setTreatmentForm} animals={animals} medications={medications} saving={savingForm} onSubmit={handleTreatmentSubmit} />
      <ControlModal open={activeModal === 'control'} onClose={closeModal} form={controlForm} setForm={setControlForm} animals={animals} saving={savingForm} onSubmit={handleControlSubmit} />
      
      </div>
    </div>
  );
}
