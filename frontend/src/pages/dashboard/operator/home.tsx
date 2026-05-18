import React from "react";
import { useNavigate } from "react-router-dom";
import StatisticsCard from "@/widgets/dashboard/Cards";
import { useAuth } from "@/features/auth/model/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { 
  ClipboardList, 
  MapPin, 
  Sprout, 
  ArrowRightLeft,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { MeshMonitor } from "@/widgets/dashboard/MeshMonitor";
import { FastInventoryAction } from "@/widgets/dashboard/FastInventoryAction";
import { FastWeightEntry } from "@/widgets/dashboard/FastWeightEntry";
import { FieldReadyWidget } from "@/widgets/dashboard/FieldReadyWidget";
import { VoiceNoteWidget } from "@/widgets/dashboard/VoiceNoteWidget";

const OperatorHome = () => {
  const { name } = useAuth();
  const navigate = useNavigate();

  const recentTasks = [
    { id: 1, type: 'Alimentación', animal: 'Lote 05', status: 'completado', time: 'Hace 2 horas' },
    { id: 2, type: 'Movimiento', animal: 'Vaca #102', status: 'pendiente', time: 'Pendiente hoy' },
    { id: 3, type: 'Control', animal: 'Potrero Central', status: 'en_progreso', time: 'Ahora' },
  ];

  return (
    <div className="bg-background px-4 pt-0 pb-6 sm:pb-8">
      <div className="w-full max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-8">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Panel de Operario</h1>
            <p className="text-sm text-muted-foreground">Hola, {name}. Revisa tus tareas diarias en la finca.</p>
          </div>
        </div>

        <div className="mb-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <MeshMonitor />
          <FastInventoryAction />
          <FastWeightEntry />
        </div>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatisticsCard
            title="Tareas Hoy"
            description="Total asignado"
            value={15}
            icon={<ClipboardList className="h-5 w-5 text-blue-500" />}
          />
          <StatisticsCard
            title="Pendientes"
            description="Por completar"
            value={4}
            icon={<Clock className="h-5 w-5 text-amber-500" />}
          />
          <StatisticsCard
            title="Potreros"
            description="Estado actual"
            value={12}
            icon={<MapPin className="h-5 w-5 text-emerald-500" />}
          />
          <StatisticsCard
            title="Alimento"
            description="Stock disponible"
            value="85%"
            icon={<Sprout className="h-5 w-5 text-green-500" />}
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Mis Tareas Recientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-all cursor-pointer border-l-4 border-l-primary">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        task.status === 'completado'
                          ? 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300'
                          : task.status === 'en_progreso'
                            ? 'bg-info-100 text-info-700 dark:bg-info-900 dark:text-info-300'
                            : 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300'
                      }`}>
                        {task.type === 'Alimentación' ? <Sprout className="h-5 w-5" /> : <ArrowRightLeft className="h-5 w-5" />}
                      </div>
                      <div>
                        <div className="font-semibold">{task.type}: {task.animal}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {task.time}
                        </div>
                      </div>
                    </div>
                    {task.status === 'completado' ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <button className="text-xs font-bold px-3 py-1 bg-primary text-primary-foreground rounded-full hover:opacity-90">
                        Marcar listo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <FieldReadyWidget />
            <VoiceNoteWidget />
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-emerald-500" />
                  Estado de Potreros
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Potrero Norte</span>
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-200 text-emerald-800 rounded-full">Óptimo</span>
                  </div>
                  <div className="flex items-center justify-between p-2 border rounded-lg bg-amber-50 dark:bg-amber-950/20">
                    <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Potrero Sur</span>
                    <span className="text-[10px] px-2 py-0.5 bg-amber-200 text-amber-800 rounded-full">Recuperación</span>
                  </div>
                  <button 
                    onClick={() => navigate('/apprentice/fields')}
                    className="w-full mt-2 py-2 text-xs text-primary hover:underline font-medium"
                  >
                    Ver mapa de potreros
                  </button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-primary/10 to-transparent">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shrink-0 shadow-lg shadow-primary/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-bold">¡Buen trabajo!</div>
                  <div className="text-[11px] text-muted-foreground">Has completado el 75% de tus tareas de hoy.</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OperatorHome;
