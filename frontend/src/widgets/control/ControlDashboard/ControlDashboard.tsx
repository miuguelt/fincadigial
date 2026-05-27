import { useState, useEffect, ReactNode } from 'react';
import { ControlStats } from '../ControlStats';
import { controlService } from '@/entities/control/api/control.service';
import { useToast } from '@/app/providers/ToastContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Button } from '@/shared/ui/button';
import { RefreshCw, Table2, Heart, BarChart3 } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

interface ControlDashboardProps {
  tableComponent?: ReactNode;
}

export function ControlDashboard({ tableComponent }: ControlDashboardProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    totalControls: 0,
    sickAnimals: 0,
    recentTreatments: 0,
    healthyPercentage: 100,
  });
  const [activeTab, setActiveTab] = useState(tableComponent ? 'table' : 'overview');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data: any = await controlService.getPaginated({ page: 1, limit: 1000 });
      const arr = Array.isArray(data) ? data : (data?.items || data?.data || data?.results || []);

      const sick = arr.filter((a: any) =>
        a.health_status?.toLowerCase().includes('enfermo') ||
        a.health_status?.toLowerCase().includes('malo') ||
        a.health_status?.toLowerCase().includes('decaído') ||
        a.healt_status?.toLowerCase().includes('enfermo') ||
        a.healt_status?.toLowerCase().includes('malo')
      ).length;

      const treatments = arr.filter((a: any) =>
        a.health_status?.toLowerCase().includes('tratamiento') ||
        a.healt_status?.toLowerCase().includes('tratamiento') ||
        (a.description?.toLowerCase() || '').includes('tratamiento')
      ).length;

      setStatsData({
        totalControls: arr.length,
        sickAnimals: sick,
        recentTreatments: treatments,
        healthyPercentage: arr.length ? ((arr.length - sick) / arr.length) * 100 : 100,
      });
    } catch (error) {
      showToast('Error al cargar métricas de control', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasNoData = !isLoading && statsData.totalControls === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Panel de Salud y Controles</h2>
          <p className="text-xs text-gray-500 mt-0.5">Monitoreo veterinario e historial clínico</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadData}
          disabled={isLoading}
          className="shadow-sm border-gray-200 h-10 px-3 self-start sm:self-auto text-gray-600 active:scale-95 transition-transform"
        >
          <RefreshCw className={cn('h-4 w-4 mr-1.5', isLoading && 'animate-spin')} />
          Actualizar Datos
        </Button>
      </div>

      {/* Health Stats */}
      <ControlStats
        totalControls={statsData.totalControls}
        sickAnimals={statsData.sickAnimals}
        recentTreatments={statsData.recentTreatments}
        healthyPercentage={statsData.healthyPercentage}
        isLoading={isLoading}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start border-b border-gray-200/60 bg-transparent h-auto p-0 rounded-none pb-px mb-6 scrollbar-none">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500 transition-colors"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Resumen General
          </TabsTrigger>
          {tableComponent && (
            <TabsTrigger
              value="table"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500 transition-colors"
            >
              <Table2 className="w-4 h-4 mr-2" />
              Ver Registros
            </TabsTrigger>
          )}
        </TabsList>

        <div className="bg-gray-50/40 p-1 rounded-lg border border-gray-100/50 shadow-inner">
          <TabsContent value="overview" className="mt-0">
            <div className={cn(
              "bg-white p-6 rounded-lg border border-gray-100 shadow-sm",
              hasNoData && "border-amber-100 bg-amber-50/5"
            )}>
              {hasNoData ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Heart className="h-12 w-12 text-gray-300 mb-3" />
                  <h3 className="text-base font-bold text-gray-700 mb-1">Sin registros de salud</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    Los datos de salud del hato aparecerán aquí cuando registres los primeros controles veterinarios.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Heart className="h-5 w-5 text-blue-500" />
                      <h3 className="text-base md:text-lg font-bold text-gray-800">Resumen de Salud del Hato</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-2 max-w-lg">
                      {statsData.sickAnimals > 0
                        ? `${statsData.sickAnimals} animal${statsData.sickAnimals !== 1 ? 'es' : ''} necesita${statsData.sickAnimals !== 1 ? 'n' : ''} atención de ${statsData.totalControls} registrado${statsData.totalControls !== 1 ? 's' : ''}.`
                        : `Todos los ${statsData.totalControls} registro${statsData.totalControls !== 1 ? 's' : ''} están en buen estado.`}
                    </p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-3xl font-black text-blue-600">{statsData.healthyPercentage.toFixed(0)}%</span>
                    <span className="text-xs font-semibold text-blue-500 uppercase tracking-wider mt-0.5">Animales sanos</span>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {tableComponent && (
            <TabsContent value="table" className="mt-0">
              <div className="bg-white rounded-lg border border-gray-100/80 shadow-sm overflow-hidden">
                {tableComponent}
              </div>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
}
