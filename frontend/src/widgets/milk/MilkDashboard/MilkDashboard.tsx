import { useState, useEffect, ReactNode, useRef } from 'react';
import { MilkStats } from '../MilkStats';
import { useCallback } from 'react';
import { MilkEntryFormWidget } from '../MilkEntryForm';
import { MilkTrendChart } from '../MilkTrendChart';
import { MilkQualityAlerts } from '../MilkQualityAlerts';
import { MilkBulkImport } from '../MilkBulkImport';
import { milkService } from '@/entities/milk/api/milk.service';
import { useToast } from '@/app/providers/ToastContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Button } from '@/shared/ui/button';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { RefreshCw, TrendingUp, Table2, Upload, Bell, Plus, MoreVertical } from 'lucide-react';

interface MilkDashboardProps {
  fincaId: number;
  tableComponent?: ReactNode;
}

export function MilkDashboard({ fincaId, tableComponent }: MilkDashboardProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [dailyData, setDailyData] = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [daily, weekly] = await Promise.all([
        milkService.getDailySummary(fincaId).catch(() => null),
        milkService.getWeeklySummary(fincaId).catch(() => null),
      ]);

      setDailyData(daily?.data || daily);
      setWeeklyData(weekly?.data || weekly);

      if (weekly?.data?.daily_breakdown || weekly?.daily_breakdown) {
        const breakdown = weekly?.data?.daily_breakdown || weekly?.daily_breakdown || [];
        setTrendData(breakdown);
      }

      const generatedAlerts: any[] = [];
      if (daily?.data?.by_session || daily?.by_session) {
        const total = daily?.data?.total_liters || daily?.total_liters || 0;
        if (total < 10) {
          generatedAlerts.push({
            id: 'low-production',
            animal_record: 'Ganado completo',
            type: 'low_production',
            severity: 'warning',
            message: 'Producción diaria por debajo de lo esperado',
            value: total,
            threshold: 10,
            date: new Date().toISOString(),
          });
        }
      }
      setAlerts(generatedAlerts);
    } catch (error) {
      showToast('Error al cargar datos de producción', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [fincaId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dailyLiters = dailyData?.total_liters || 0;
  const weeklyAverage = weeklyData?.avg_daily_liters || 0;
  const trendPercentage = weeklyData?.trend_vs_previous_month?.change_percentage || 0;
  const animalsMilked = dailyData?.count || 0;

  return (
    <div className="space-y-5">
      {/* Header with actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black tracking-tight text-foreground">Producción de Leche</h2>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Más opciones"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute left-0 top-full mt-1.5 bg-card rounded-2xl shadow-xl border border-border/80 py-1.5 min-w-[160px] max-w-[90vw] z-50 backdrop-blur-md">
                <button
                  onClick={() => { loadData(); setMenuOpen(false); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                  Actualizar datos
                </button>
                <button
                  onClick={() => { setIsImportModalOpen(true); setMenuOpen(false); }}
                  className="w-full px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-muted flex items-center gap-2 transition-colors"
                >
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  Importar Excel
                </button>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setIsEntryModalOpen(true)}
          className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white min-h-11 px-5 shadow-sm shadow-blue-600/25 active:scale-95 font-bold transition-all w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Registrar Ordeño
        </Button>
      </div>

      {/* Milk stats */}
      <MilkStats
        dailyLiters={dailyLiters}
        weeklyAverage={weeklyAverage}
        trendPercentage={trendPercentage}
        animalsMilked={animalsMilked}
        isLoading={isLoading}
      />

      {/* Tabs: overview chart / table / alerts */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
        <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start border-b border-border bg-transparent h-auto p-0 rounded-none pb-px mb-6 scrollbar-none">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-bold text-muted-foreground transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Resumen Gráfico
          </TabsTrigger>
          {tableComponent && (
            <TabsTrigger
              value="table"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-bold text-muted-foreground transition-colors"
            >
              <Table2 className="w-4 h-4 mr-2" />
              Ver Registros
            </TabsTrigger>
          )}
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-bold text-muted-foreground relative transition-colors"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alertas
            {alerts.length > 0 && (
              <span className="absolute top-2.5 right-1.5 flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <div className="p-0">
          <TabsContent value="overview" className="mt-0">
            <MilkTrendChart data={trendData} isLoading={isLoading} period="week" />
          </TabsContent>

          {tableComponent && (
            <TabsContent value="table" className="mt-0">
              {tableComponent}
            </TabsContent>
          )}

          <TabsContent value="alerts" className="mt-0">
            <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm">
              <MilkQualityAlerts alerts={alerts} isLoading={isLoading} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <GenericModal
        isOpen={isEntryModalOpen}
        onOpenChange={setIsEntryModalOpen}
        title="Registrar ordeño"
        themeColor="blue"
        size="2xl"
      >
        <div className="p-4 sm:p-6 bg-card rounded-b-2xl">
          <MilkEntryFormWidget
            onSuccess={() => { setIsEntryModalOpen(false); loadData(); }}
            onCancel={() => setIsEntryModalOpen(false)}
          />
        </div>
      </GenericModal>

      <GenericModal
        isOpen={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        title="Importar desde Excel"
        themeColor="blue"
        size="3xl"
      >
        <div className="p-4 sm:p-6 bg-card rounded-b-2xl">
          <MilkBulkImport fincaId={fincaId} onSuccess={() => { setIsImportModalOpen(false); loadData(); }} />
        </div>
      </GenericModal>
    </div>
  );
}
