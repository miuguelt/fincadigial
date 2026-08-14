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
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-800">Producción de Leche</h2>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[140px] max-w-[90vw] z-50">
                <button
                  onClick={() => { loadData(); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Actualizar
                </button>
                <button
                  onClick={() => { setIsImportModalOpen(true); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importar Excel
                </button>
              </div>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => setIsEntryModalOpen(true)}
          className="shadow-md bg-emerald-600 hover:bg-emerald-700 text-white h-11 px-5 active:scale-95 transition-transform font-semibold w-full sm:w-auto"
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
        <TabsList className="flex w-full sm:w-auto overflow-x-auto justify-start border-b border-gray-200 bg-transparent h-auto p-0 rounded-none pb-px mb-6 scrollbar-none">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500 transition-colors"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Resumen Gráfico
          </TabsTrigger>
          {tableComponent && (
            <TabsTrigger
              value="table"
              className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500 transition-colors"
            >
              <Table2 className="w-4 h-4 mr-2" />
              Ver Registros
            </TabsTrigger>
          )}
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500 relative transition-colors"
          >
            <Bell className="w-4 h-4 mr-2" />
            Alertas
            {alerts.length > 0 && (
              <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>
            )}
          </TabsTrigger>
        </TabsList>

        <div className="bg-gray-50/50 p-1 rounded-xl">
          <TabsContent value="overview" className="mt-0">
            <MilkTrendChart data={trendData} isLoading={isLoading} period="week" />
          </TabsContent>

          {tableComponent && (
            <TabsContent value="table" className="mt-0">
              {tableComponent}
            </TabsContent>
          )}

          <TabsContent value="alerts" className="mt-0">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <MilkQualityAlerts alerts={alerts} isLoading={isLoading} />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      <GenericModal
        isOpen={isEntryModalOpen}
        onOpenChange={setIsEntryModalOpen}
        title="Registrar ordeño"
        themeColor="emerald"
        size="2xl"
      >
        <div className="p-4 sm:p-6 bg-white rounded-b-2xl">
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
        <div className="p-4 sm:p-6 bg-white rounded-b-2xl">
          <MilkBulkImport fincaId={fincaId} onSuccess={() => { setIsImportModalOpen(false); loadData(); }} />
        </div>
      </GenericModal>
    </div>
  );
}
