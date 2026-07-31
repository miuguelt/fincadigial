import { useEffect, useState, useMemo } from 'react';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn } from '@/shared/types/crud';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useAuth } from '@/features/auth/model/useAuth';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { ControlStats, ControlDashboard, ControlEntryFormWidget } from '@/widgets/control';
import { MilkEntryFormWidget, MilkStats } from '@/widgets/milk';
import MilkProductionPage from '../milk_production';
import { GenericModal } from '@/shared/ui/common/GenericModal';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/entities/animal/ui';
import { LayoutDashboard, Milk, Heart } from 'lucide-react';
import { TaskIndicator } from './components/TaskIndicator';
import { useControlsSummary } from './hooks/useControlsSummary';
import {
  buildCrudConfig, serviceAdapter, initialFormData,
  mapResponseToForm, validateControlForm, makeCustomDetailContent,
} from './crudConfig.tsx';

const AdminControlPage = () => {
  const { role: userRole, user } = useAuth() as any;
  const isCampesino = userRole === 'Operario' || userRole === 'Aprendiz';
  const fincaId = user?.finca_id;
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [isMilkModalOpen, setIsMilkModalOpen] = useState(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);

  const summary = useControlsSummary(fincaId);

  useEffect(() => {
    if (isCampesino && viewMode !== 'cards') setViewMode('cards');
  }, [isCampesino, viewMode, setViewMode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const list = await animalsService.getAll({ page: 1, page_size: 1000 } as any);
        const raw: any = list;
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? raw?.results ?? []);
        const options = arr.map((a: any) => ({ value: a.id, label: a.record || `ID ${a.id}` }));
        if (mounted) setAnimalOptions(options);
      } catch {
        if (mounted) setAnimalOptions([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const columns: CRUDColumn<ControlResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'animal_id', label: 'Animal', render: (value: any) => {
      if (!value) return '-';
      return <AnimalLink id={Number(value)} label={animalMap.get(Number(value)) || `Animal ${value}`} />;
    }},
    { key: 'checkup_date', label: 'Fecha de Chequeo', render: (_v: any, item: any) => {
      const d = item?.checkup_date ?? item?.control_date;
      return d ? new Date(d as string).toLocaleDateString('es-ES') : '-';
    }},
    { key: 'weight', label: 'Peso', render: (v: any) => (v != null ? `${Number(v).toFixed(1)} kg` : '-') },
    { key: 'height', label: 'Altura', render: (v: any) => (v != null ? `${Number(v).toFixed(1)} m` : '-') },
    { key: 'health_status', label: 'Estado de Salud', render: (_v: any, item: any) => item?.health_status ?? item?.healt_status ?? '-' },
    { key: 'description', label: 'Descripción', render: (_v: any, item: any) => item?.description ?? item?.observations ?? '-' },
    { key: 'created_at', label: 'Creado', render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-ES') : '-') },
  ], [animalMap]);

  const todayFormatted = new Date(getTodayColombia()).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  const noMilkToday = !summary.loading && summary.dailyLiters === 0;
  const hasSickAnimals = summary.sickAnimals > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header global: visible en todas las pestañas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Registro de la Finca</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 capitalize">{todayFormatted}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button onClick={() => setIsMilkModalOpen(true)} className="h-12 sm:h-11 px-6 text-sm font-bold rounded-xl shadow-md bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">🥛 Registrar ordeño</Button>
          <Button onClick={() => setIsWeightModalOpen(true)} className="h-12 sm:h-11 px-4 text-sm font-bold rounded-xl shadow-md bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">🐄 Pesar animal</Button>
          <Button onClick={() => setIsControlModalOpen(true)} className="h-12 sm:h-11 px-6 text-sm font-bold rounded-xl shadow-md bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto">🏥 Registrar novedad</Button>
        </div>
      </div>

      {/* Tabs de navegación */}
      <Tabs defaultValue="resumen" className="w-full">
        <TabsList className="flex w-full overflow-x-auto justify-start border-b border-gray-200 bg-transparent h-auto p-0 rounded-none pb-px mb-4 scrollbar-none">
          <TabsTrigger value="resumen" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500">
            <LayoutDashboard className="w-4 h-4 mr-2" />
            ¿Cómo vamos hoy?
          </TabsTrigger>
          <TabsTrigger value="leche" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500">
            <Milk className="w-4 h-4 mr-2" />
            🥛 Ordeño
          </TabsTrigger>
          <TabsTrigger value="salud" className="data-[state=active]:border-b-2 data-[state=active]:border-emerald-600 data-[state=active]:text-emerald-600 data-[state=active]:shadow-none bg-transparent rounded-none px-4 py-3 font-semibold text-gray-500">
            <Heart className="w-4 h-4 mr-2" />
            🏥 Revisiones
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: ¿Cómo vamos hoy? */}
        <TabsContent value="resumen" className="mt-0 space-y-4">
          <TaskIndicator
            noMilkToday={noMilkToday} hasSickAnimals={hasSickAnimals}
            sickAnimals={summary.sickAnimals}
            onRegisterMilk={() => setIsMilkModalOpen(true)}
            onScrollToHealth={() => {
              const tab = document.querySelector('[data-value="salud"]') as HTMLButtonElement;
              tab?.click();
            }}
          />

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Milk className="h-5 w-5 text-blue-500" />
              🥛 Leche de hoy
            </h2>
            <MilkStats dailyLiters={summary.dailyLiters} weeklyAverage={summary.weeklyAverage} trendPercentage={summary.trendPercentage} animalsMilked={summary.animalsMilked} isLoading={summary.loading} simple />
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5">
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Heart className="h-5 w-5 text-emerald-500" />
              🏥 Salud de la finca
            </h2>
            <ControlStats totalControls={summary.totalControls} sickAnimals={summary.sickAnimals} recentTreatments={summary.recentTreatments} healthyPercentage={summary.healthyPercentage} isLoading={summary.loading} simple />
          </div>
        </TabsContent>

        {/* PESTAÑA 2: Ordeño */}
        <TabsContent value="leche" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Toda la leche</h2>
              <Button onClick={() => setIsMilkModalOpen(true)} size="sm" className="h-9 px-3 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white">🥛 Registrar ordeño</Button>
            </div>
            <div className="p-0"><MilkProductionPage /></div>
          </div>
        </TabsContent>

        {/* PESTAÑA 3: Revisiones */}
        <TabsContent value="salud" className="mt-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-800">Todas las revisiones</h2>
              <Button onClick={() => setIsControlModalOpen(true)} size="sm" className="h-9 px-3 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white">🏥 Registrar novedad</Button>
            </div>
            <div className="p-0">
              <ControlDashboard tableComponent={
                <AdminCRUDPage
                  config={buildCrudConfig(animalOptions, columns, viewMode, setViewMode, isCampesino) as any}
                  service={serviceAdapter}
                  initialFormData={initialFormData}
                  mapResponseToForm={mapResponseToForm}
                  validateForm={validateControlForm}
                  customDetailContent={makeCustomDetailContent(animalOptions)}
                  realtime enhancedHover refetchOnReconnect
                />
              } />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal pesaje rápido */}
      <GenericModal isOpen={isWeightModalOpen} onOpenChange={setIsWeightModalOpen} title="Pesar animal" themeColor="amber" size="lg" enableBackdropBlur>
        <div className="p-2 text-sm text-gray-500 mb-4">Registra el peso de un animal rápidamente.</div>
        <ControlEntryFormWidget
          onSuccess={() => setIsWeightModalOpen(false)}
          onCancel={() => setIsWeightModalOpen(false)}
        />
      </GenericModal>

      {/* Modales globales */}
      <GenericModal isOpen={isMilkModalOpen} onOpenChange={setIsMilkModalOpen} title="Registrar ordeño" themeColor="blue" size="lg" enableBackdropBlur>
        <MilkEntryFormWidget onSuccess={() => setIsMilkModalOpen(false)} onCancel={() => setIsMilkModalOpen(false)} />
      </GenericModal>

      <GenericModal isOpen={isControlModalOpen} onOpenChange={setIsControlModalOpen} title="Registrar novedad de salud" themeColor="emerald" size="lg" enableBackdropBlur>
        <ControlEntryFormWidget onSuccess={() => setIsControlModalOpen(false)} onCancel={() => setIsControlModalOpen(false)} />
      </GenericModal>
    </div>
  );
};

export default AdminControlPage;
