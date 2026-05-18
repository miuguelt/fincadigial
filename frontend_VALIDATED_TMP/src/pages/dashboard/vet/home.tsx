import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import StatisticsCard from "@/widgets/dashboard/Cards";
import { useAuth } from "@/features/auth/model/useAuth";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { useAnimalDiseases } from "@/entities/animal-disease/model/useAnimalDiseases";
import { useAnalytics } from "@/features/reporting/model/useAnalytics";
import { useInventory } from "@/entities/inventory/model/useInventory";
import { useReproduction } from "@/entities/reproduction/model/useReproduction";
import { safeArray } from '@/shared/utils/apiHelpers';
import DailyFarmGuide from '@/widgets/dashboard/DailyFarmGuide';
import {
  HeartPulse,
  Activity,
  Syringe,
  Scan,
  Plus,
  History,
  ClipboardList,
  Package,
  Baby,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';

const VetHome = () => {
  const navigate = useNavigate();
  const { useHealthStatistics, useAnimalStatistics } = useAnalytics();
  const { useAlerts: useInventoryAlerts } = useInventory();
  const { usePendingBirths } = useReproduction();
  
  // Queries dinámicas
  const { data: healthStats, isLoading: loadingHealth } = useHealthStatistics();
  const { data: animalStats, isLoading: loadingAnimals } = useAnimalStatistics();
  const { data: animalDiseases } = useAnimalDiseases();
  const { data: inventoryAlerts } = useInventoryAlerts(30);
  const { data: pendingBirths } = usePendingBirths(30);
  
  const safeAnimalDiseases = safeArray(animalDiseases);
  const totalSick = animalStats?.by_status?.['Enfermo'] || safeAnimalDiseases.length;

  const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#6366f1", "#a855f7"];

  // Preparar datos para el gráfico de dona
  const chartData = useMemo(() => {
    if (!animalStats?.by_status) return [];
    return Object.entries(animalStats.by_status)
      .map(([status, count]) => ({ status, count }))
      .filter(item => (item.count as number) > 0);
  }, [animalStats]);

  const totalAnimals = animalStats?.total || 1;
  const healthPercentage = useMemo(() => {
    if (!animalStats?.by_status) return 100;
    const sickCount = (animalStats.by_status['Enfermo'] || 0) + (animalStats.by_status['En tratamiento'] || 0);
    return Math.max(0, Math.round(((totalAnimals - sickCount) / totalAnimals) * 100));
  }, [animalStats, totalAnimals]);

  const isLoading = loadingHealth || loadingAnimals;

  return (
    <div className="bg-background px-4 pt-4 pb-8 sm:px-8 space-y-10">
      <div className="w-full max-w-7xl mx-auto space-y-10">
        {/* Header con Bienvenida y Acciones Rápidas */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-surface border border-border p-8 rounded-3xl shadow-sm relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight mb-2">
              Panel <span className="premium-gradient-text">Veterinario</span>
            </h1>
            <p className="text-text-secondary max-w-lg leading-relaxed">
              Gestión de salud animal avanzada. Monitorea casos clínicos, programa vacunaciones y coordina tratamientos.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 relative z-10">
            <button
              onClick={() => navigate('/instructor/scanner')}
              className="group flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold transition-all hover:shadow-lg hover:scale-[1.02] active:scale-95"
            >
              <Scan className="h-5 w-5 transition-transform group-hover:rotate-12" />
              <span>Escanear Tag</span>
            </button>
            <button
              onClick={() => navigate('/instructor/treatments')}
              className="flex items-center gap-2 px-6 py-3 bg-surface border border-border text-text-primary rounded-2xl font-bold transition-all hover:bg-state-hover"
            >
              <Plus className="h-5 w-5 text-primary" />
              <span>Nuevo Caso</span>
            </button>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20" />
        </div>

        {/* Sección de Alertas Críticas */}
        {(inventoryAlerts?.summary.low_stock_count || 0) + (pendingBirths?.length || 0) > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
            {inventoryAlerts?.summary.low_stock_count && inventoryAlerts.summary.low_stock_count > 0 && (
              <div 
                onClick={() => navigate('/instructor/inventory')}
                className="flex items-center gap-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="h-12 w-12 rounded-xl bg-rose-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20">
                  <Package className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-rose-900 dark:text-rose-100">Bajo Stock en Inventario</h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300">{inventoryAlerts.summary.low_stock_count} productos requieren reabastecimiento pronto.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-rose-400 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
            
            {pendingBirths && pendingBirths.length > 0 && (
              <div 
                onClick={() => navigate('/instructor/reproduction')}
                className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-2xl cursor-pointer hover:shadow-md transition-all group"
              >
                <div className="h-12 w-12 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Baby className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100">Próximos Partos</h4>
                  <p className="text-xs text-blue-700 dark:text-blue-300">{pendingBirths.length} partos programados para los próximos 30 días.</p>
                </div>
                <ChevronRight className="h-5 w-5 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </div>
            )}
          </section>
        )}

        {/* Guía del Día — alertas prioritarias del motor veterinario */}
        <DailyFarmGuide />

        {/* Stats Grid con Datos Reales */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatisticsCard
            title="Enfermos"
            value={isLoading ? '...' : totalSick}
            icon={<HeartPulse />}
            color="text-rose-500"
            description="Atención inmediata"
          />
          <StatisticsCard
            title="Tratamientos"
            value={isLoading ? '...' : (healthStats?.active_treatments || 0)}
            icon={<Activity />}
            color="text-amber-500"
            description="En curso"
          />
          <StatisticsCard
            title="Vacunas"
            value={isLoading ? '...' : (healthStats?.pending_vaccinations || 0)}
            icon={<Syringe />}
            color="text-blue-500"
            description="Pendientes"
          />
          <StatisticsCard
            title="Efectividad"
            value={isLoading ? '...' : `${healthStats?.treatment_success_rate || 0}%`}
            icon={<ClipboardList />}
            color="text-emerald-500"
            description="Tasa de éxito"
          />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Timeline de Casos Clínicos */}
          <Card className="lg:col-span-2 rounded-3xl border-border shadow-sm overflow-hidden">
            <CardHeader className="bg-surface border-b border-border pb-6">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold flex items-center gap-3">
                  <History className="h-6 w-6 text-primary" />
                  Casos Clínicos Recientes
                </CardTitle>
                <button onClick={() => navigate('/instructor/disease-animals')} className="text-sm font-bold text-primary hover:underline">
                  Ver todo
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-6">
                {safeAnimalDiseases.slice(0, 5).map((disease: any, idx) => (
                  <div key={disease.id} className="relative pl-10 group">
                    {/* Línea de Timeline */}
                    {idx !== safeAnimalDiseases.slice(0, 5).length - 1 && (
                      <div className="absolute left-4 top-10 bottom-[-24px] w-[2px] bg-border group-hover:bg-primary/30 transition-colors" />
                    )}
                    
                    {/* Punto de Timeline */}
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center border-2 border-background z-10">
                      <HeartPulse className="h-4 w-4 text-rose-600" />
                    </div>

                    <button 
                      onClick={() => navigate(`/instructor/disease-animals`)}
                      className="w-full text-left p-4 rounded-2xl bg-background border border-border hover:border-primary/40 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-black text-text-primary">Animal #{disease.animal_id}</h4>
                          <p className="text-sm text-text-secondary">{disease.disease_name || 'Diagnóstico pendiente'}</p>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-amber-100 text-amber-700 rounded-lg">
                          {disease.status || 'Observación'}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-secondary opacity-70">
                        <span className="flex items-center gap-1"><Activity className="h-3 w-3" /> Reportado el {new Date(disease.diagnosis_date).toLocaleDateString()}</span>
                      </div>
                    </button>
                  </div>
                ))}
                
                {safeAnimalDiseases.length === 0 && !isLoading && (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <HeartPulse className="h-8 w-8 text-emerald-600" />
                    </div>
                    <p className="text-text-secondary font-medium">Estado Sanitario Óptimo</p>
                    <p className="text-xs text-text-secondary opacity-60">No se registran alertas de salud activas.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Distribución de Salud Dinámica */}
          <Card className="rounded-3xl border-border shadow-sm">
            <CardHeader className="bg-surface border-b border-border pb-6">
              <CardTitle className="text-xl font-bold">Estado del Hato</CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-[300px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={90}
                      paddingAngle={8}
                      dataKey="count"
                      nameKey="status"
                      stroke="none"
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Texto central del donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-4xl font-black text-text-primary tracking-tighter">
                    {healthPercentage}%
                  </span>
                  <span className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Salud</span>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {chartData.map((item, i) => (
                  <div key={item.status} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="font-medium text-text-secondary">{item.status}</span>
                    </div>
                    <span className="font-black text-text-primary">
                      {Math.round(((item.count as number) / totalAnimals) * 100)}%
                    </span>
                  </div>
                ))}
                {chartData.length === 0 && !isLoading && (
                  <p className="text-center text-sm text-muted-foreground">Sin datos de estado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
};

export default VetHome;
