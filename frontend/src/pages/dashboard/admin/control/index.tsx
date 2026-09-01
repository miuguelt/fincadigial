import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGlobalViewMode } from '@/shared/hooks/useGlobalViewMode';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn } from '@/shared/types/crud';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { animalsService } from '@/entities/animal/api/animal.service';
import { useAuth } from '@/features/auth/model/useAuth';
import type { ControlResponse } from '@/shared/api/generated/swaggerTypes';
import { Button } from '@/shared/ui/button';
import { ControlStats } from '@/widgets/control';
import { MilkStats } from '@/widgets/milk';
import MilkProductionPage from '../milk_production';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/entities/animal/ui';
import { BarChart3, Heart, LayoutDashboard, Milk, Stethoscope } from 'lucide-react';
import { TaskIndicator } from './components/TaskIndicator';
import { AttentionAnimalsPanel } from './components/AttentionAnimalsPanel';
import { buildAttentionViews } from './components/attentionAnimals.model';
import { DailyWorkSection } from './components/DailyWorkSection';
import { ControlEntryModals, type ControlEntryModal } from './components/ControlEntryModals';
import { ReportsTab } from './reports/ReportsTab';
import { useControlsSummary } from './hooks/useControlsSummary';
import { formatAnimalHeight, formatControlPageDate, parseDateOnlyLocal } from './controlPage.utils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';
import {
  buildCrudConfig, serviceAdapter, initialFormData,
  mapResponseToForm, validateControlForm, makeCustomDetailContent,
} from './crudConfig.tsx';

const TAB_TRIGGER_CLASS =
  'min-h-11 min-w-0 gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm data-[state=inactive]:text-muted-foreground hover:text-foreground sm:text-sm';

const AdminControlPage = () => {
  const { role: userRole, user } = useAuth() as any;
  const isCampesino = userRole === 'Operario' || userRole === 'Aprendiz';
  const fincaId = user?.finca_id;
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [activeModal, setActiveModal] = useState<ControlEntryModal>(null);
  const [healthAnimalId, setHealthAnimalId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState('resumen');
  const attentionRef = useRef<HTMLElement>(null);

  const summary = useControlsSummary(fincaId);

  useEffect(() => {
    if (isCampesino && viewMode !== 'cards') setViewMode('cards');
  }, [isCampesino, viewMode, setViewMode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await animalsService.getAll({ page: 1, page_size: 500 } as any);
        const raw: any = list;
        const arr: any[] = Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? raw?.results ?? []);
        const options = arr.map((a: any) => ({ value: a.id, label: a.record || `ID ${a.id}` }));
        if (mounted) setAnimalOptions(options);
      } catch {
        if (mounted) setAnimalOptions([]);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const labelOf = useCallback(
    (animalId: number) => animalMap.get(animalId) || `Animal ${animalId}`,
    [animalMap],
  );

  const attentionAnimals = useMemo(
    () => buildAttentionViews(summary.attentionAnimals ?? [], (id) => animalMap.get(id)),
    [summary.attentionAnimals, animalMap],
  );

  const columns: CRUDColumn<ControlResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'animal_id', label: 'Animal', render: (value: any) => {
      if (!value) return '-';
      return <AnimalLink id={Number(value)} label={animalMap.get(Number(value)) || `Animal ${value}`} />;
    }},
    { key: 'checkup_date', label: 'Fecha de Chequeo', render: (_v: any, item: any) => {
      const d = item?.checkup_date ?? item?.control_date;
      const parsed = d ? parseDateOnlyLocal(String(d)) : null;
      return parsed ? parsed.toLocaleDateString('es-CO') : '-';
    }},
    { key: 'weight', label: 'Peso', render: (v: any) => (v != null ? `${Number(v).toFixed(1)} kg` : '-') },
    { key: 'height', label: 'Alzada', render: (v: any) => formatAnimalHeight(v) },
    { key: 'health_status', label: 'Estado de Salud', render: (_v: any, item: any) => item?.health_status ?? item?.healt_status ?? '-' },
    { key: 'description', label: 'Descripción', render: (_v: any, item: any) => item?.description ?? item?.observations ?? '-' },
    { key: 'created_at', label: 'Creado', render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '-') },
  ], [animalMap]);

  const today = getTodayColombia();
  const todayFormatted = formatControlPageDate(today);

  const noMilkToday = !summary.loading && summary.dailyLiters === 0;
  const hasSickAnimals = summary.sickAnimals > 0;

  const openHealthModal = useCallback((animalId?: number) => {
    setHealthAnimalId(animalId);
    setActiveModal('health');
  }, []);

  /**
   * El listado vive en la misma pestaña "Hoy"; se desplaza y se enfoca para que
   * también el lector de pantalla llegue al panel, no solo la vista.
   */
  const showAttentionAnimals = useCallback(() => {
    setActiveTab('resumen');
    requestAnimationFrame(() => {
      attentionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      attentionRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const handleMilkSuccess = () => {
    setActiveModal(null);
    summary.refresh();
    if (typeof window !== 'undefined') {
      emitDataRefresh('milk-production');
    }
  };

  const handleControlSuccess = () => {
    setActiveModal(null);
    summary.refresh();
    if (typeof window !== 'undefined') {
      emitDataRefresh('control');
    }
  };

  return (
    <div className="space-y-5 pb-24 sm:space-y-6 sm:pb-8">
      <DailyWorkSection
        todayFormatted={todayFormatted}
        onRegisterMilk={() => setActiveModal('milk')}
        onRegisterWeight={() => setActiveModal('weight')}
        onReportHealth={() => openHealthModal(undefined)}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-5 grid h-auto w-full grid-cols-2 gap-1.5 rounded-2xl border border-border/70 bg-muted/60 p-1.5 backdrop-blur-md min-[480px]:grid-cols-4">
          <TabsTrigger value="resumen" aria-label="Resumen de hoy" className={`${TAB_TRIGGER_CLASS} data-[state=active]:text-foreground`}>
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            <span>Hoy</span>
            {hasSickAnimals && (
              <span className="ml-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-black text-white shadow-sm shadow-red-600/30">
                {summary.sickAnimals}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="leche" aria-label="Historial de ordeños" className={`${TAB_TRIGGER_CLASS} data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400`}>
            <Milk className="h-4 w-4" aria-hidden="true" />
            <span>Ordeños</span>
          </TabsTrigger>
          <TabsTrigger value="salud" aria-label="Revisiones de salud" className={`${TAB_TRIGGER_CLASS} data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400`}>
            <Heart className="h-4 w-4" aria-hidden="true" />
            <span>Salud</span>
          </TabsTrigger>
          <TabsTrigger value="reportes" aria-label="Estadísticas y reportes" className={`${TAB_TRIGGER_CLASS} data-[state=active]:text-indigo-600 dark:data-[state=active]:text-indigo-400`}>
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span>Reportes</span>
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: ¿Cómo vamos hoy? */}
        <TabsContent value="resumen" className="mt-0 space-y-5">
          <TaskIndicator
            noMilkToday={noMilkToday} hasSickAnimals={hasSickAnimals}
            sickAnimals={summary.sickAnimals}
            milkKnown={!summary.milkUnavailable}
            controlsKnown={!summary.controlsUnavailable}
            onRegisterMilk={() => setActiveModal('milk')}
            onShowSickAnimals={showAttentionAnimals}
          />

          <AttentionAnimalsPanel
            ref={attentionRef}
            animals={attentionAnimals}
            loading={summary.loading}
            unavailable={summary.controlsUnavailable}
            canRecord
            onReview={openHealthModal}
          />

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <section className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                    <Milk className="h-5 w-5" aria-hidden="true" />
                  </div>
                  Ordeño de hoy
                </h2>
              </div>
              <MilkStats dailyLiters={summary.dailyLiters} weeklyAverage={summary.weeklyAverage} trendPercentage={summary.trendPercentage} animalsMilked={summary.animalsMilked} isLoading={summary.loading} simple />
            </section>

            <section className="rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl transition-all sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-foreground">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                    <Heart className="h-5 w-5" aria-hidden="true" />
                  </div>
                  Salud del ganado
                </h2>
              </div>
              <ControlStats totalControls={summary.totalControls} sickAnimals={summary.sickAnimals} recentTreatments={summary.recentTreatments} healthyPercentage={summary.healthyPercentage} isLoading={summary.loading} simple />
            </section>
          </div>
        </TabsContent>

        {/* PESTAÑA 2: Ordeño */}
        <TabsContent value="leche" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6">
            <MilkProductionPage />
          </div>
        </TabsContent>

        {/* PESTAÑA 3: Revisiones */}
        <TabsContent value="salud" className="mt-0">
          <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4 text-card-foreground shadow-sm backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex flex-col gap-3 min-[480px]:flex-row min-[480px]:items-center min-[480px]:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-foreground">Revisiones de salud</h2>
                <p className="mt-0.5 text-xs font-medium text-muted-foreground">Historial completo de chequeos y novedades.</p>
              </div>
              <Button onClick={() => openHealthModal(undefined)} size="sm" className="min-h-11 w-full rounded-xl bg-emerald-600 px-5 text-sm font-bold text-white shadow-sm shadow-emerald-600/25 transition-all hover:bg-emerald-700 active:scale-95 min-[480px]:w-auto">
                <Stethoscope className="mr-2 h-4 w-4" aria-hidden="true" /> Reportar salud
              </Button>
            </div>
            <div className="p-0">
              <AdminCRUDPage
                config={buildCrudConfig(animalOptions, columns, viewMode, setViewMode, isCampesino) as any}
                service={serviceAdapter}
                initialFormData={initialFormData}
                mapResponseToForm={mapResponseToForm}
                validateForm={validateControlForm}
                customDetailContent={makeCustomDetailContent(animalOptions)}
                realtime enhancedHover refetchOnReconnect
              />
            </div>
          </div>
        </TabsContent>

        {/* PESTAÑA 4: Estadísticas y reportes */}
        <TabsContent value="reportes" className="mt-0">
          <ReportsTab
            fincaId={fincaId}
            today={today}
            controlRows={summary.controlRows ?? []}
            controlsUnavailable={summary.controlsUnavailable}
            controlsLoading={summary.loading}
            canRecord
            labelOf={labelOf}
            onReview={openHealthModal}
          />
        </TabsContent>
      </Tabs>

      <ControlEntryModals
        active={activeModal}
        healthAnimalId={healthAnimalId}
        onClose={() => setActiveModal(null)}
        onMilkSaved={handleMilkSuccess}
        onControlSaved={handleControlSuccess}
      />
    </div>
  );
};

export default AdminControlPage;
