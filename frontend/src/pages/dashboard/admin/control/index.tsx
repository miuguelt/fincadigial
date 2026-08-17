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
import { ChevronRight, Heart, LayoutDashboard, Milk, Scale, Stethoscope } from 'lucide-react';
import { TaskIndicator } from './components/TaskIndicator';
import { useControlsSummary } from './hooks/useControlsSummary';
import { formatControlPageDate, parseDateOnlyLocal } from './controlPage.utils';
import { emitDataRefresh } from '@/shared/utils/dataRefresh';
import {
  buildCrudConfig, serviceAdapter, initialFormData,
  mapResponseToForm, validateControlForm, makeCustomDetailContent,
} from './crudConfig.tsx';

const AdminControlPage = () => {
  const { role: userRole, user } = useAuth() as any;
  const isCampesino = userRole === 'Operario' || userRole === 'Aprendiz';
  const fincaId = user?.finca_id;
  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [viewMode, setViewMode] = useGlobalViewMode();
  const [isMilkModalOpen, setIsMilkModalOpen] = useState(false);
  const [isControlModalOpen, setIsControlModalOpen] = useState(false);
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('resumen');

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
    { key: 'height', label: 'Altura', render: (v: any) => (v != null ? `${Number(v).toFixed(1)} m` : '-') },
    { key: 'health_status', label: 'Estado de Salud', render: (_v: any, item: any) => item?.health_status ?? item?.healt_status ?? '-' },
    { key: 'description', label: 'Descripción', render: (_v: any, item: any) => item?.description ?? item?.observations ?? '-' },
    { key: 'created_at', label: 'Creado', render: (v: any) => (v ? new Date(v as string).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }) : '-') },
  ], [animalMap]);

  const todayFormatted = formatControlPageDate(getTodayColombia());

  const noMilkToday = !summary.loading && summary.dailyLiters === 0;
  const hasSickAnimals = summary.sickAnimals > 0;

  const handleMilkSuccess = () => {
    setIsMilkModalOpen(false);
    summary.refresh();
  };

  const notifyControlsSaved = () => {
    summary.refresh();
    if (typeof window !== 'undefined') {
      // The quick-entry modals use the same service as the CRUD list, but the
      // list has its own resource cache. Invalidate both refresh channels so a
      // successful save is visible without a full page reload.
      emitDataRefresh('control');
    }
  };

  const handleControlSuccess = () => {
    setIsControlModalOpen(false);
    notifyControlsSaved();
  };

  const handleWeightSuccess = () => {
    setIsWeightModalOpen(false);
    notifyControlsSaved();
  };

  return (
    <div className="space-y-4 pb-24 sm:space-y-6 sm:pb-8">
      <section
        aria-labelledby="registro-diario-title"
        className="rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5"
      >
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700 dark:text-emerald-300">
            Trabajo de hoy
          </p>
          <h1 id="registro-diario-title" className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
            Registro diario
          </h1>
          <p className="mt-1 text-sm font-medium capitalize text-muted-foreground">{todayFormatted}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            Elige una tarea. Solo pediremos los datos necesarios para guardarla desde el campo.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" role="group" aria-label="Acciones rápidas de campo">
          <button
            type="button"
            onClick={() => setIsMilkModalOpen(true)}
            className="col-span-2 flex min-h-16 items-center gap-3 rounded-xl bg-blue-700 px-4 py-3 text-left text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-[0.99] sm:col-span-1"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Milk className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-extrabold leading-tight">Registrar ordeño</span>
              <span className="mt-0.5 block text-xs text-blue-100">Litros y turno</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setIsWeightModalOpen(true)}
            className="flex min-h-20 items-center gap-2 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-3 text-left text-amber-950 transition hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 dark:hover:bg-amber-950/60 sm:min-h-16"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/80 dark:bg-amber-800/70">
              <Scale className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight sm:text-base">Pesar animal</span>
              <span className="mt-0.5 hidden text-xs text-amber-800 min-[440px]:block dark:text-amber-200">Peso de hoy</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsControlModalOpen(true)}
            className="flex min-h-20 items-center gap-2 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-3 py-3 text-left text-emerald-950 transition hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 active:scale-[0.99] dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-950/60 sm:min-h-16"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-200/80 dark:bg-emerald-800/70">
              <Stethoscope className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight sm:text-base">Reportar salud</span>
              <span className="mt-0.5 hidden text-xs text-emerald-800 min-[440px]:block dark:text-emerald-200">Síntomas o novedad</span>
            </span>
          </button>
        </div>
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-3 rounded-xl border border-border bg-muted/70 p-1">
          <TabsTrigger value="resumen" aria-label="Resumen de hoy" className="min-h-12 min-w-0 gap-1 rounded-lg px-1.5 py-2 text-xs font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm">
            <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
            Hoy
          </TabsTrigger>
          <TabsTrigger value="leche" aria-label="Historial de ordeños" className="min-h-12 min-w-0 gap-1 rounded-lg px-1.5 py-2 text-xs font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-blue-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-blue-300 sm:text-sm">
            <Milk className="h-4 w-4" aria-hidden="true" />
            Ordeños
          </TabsTrigger>
          <TabsTrigger value="salud" aria-label="Revisiones de salud" className="min-h-12 min-w-0 gap-1 rounded-lg px-1.5 py-2 text-xs font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm dark:data-[state=active]:text-emerald-300 sm:text-sm">
            <Heart className="h-4 w-4" aria-hidden="true" />
            Salud
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: ¿Cómo vamos hoy? */}
        <TabsContent value="resumen" className="mt-0 space-y-4">
          <TaskIndicator
            noMilkToday={noMilkToday} hasSickAnimals={hasSickAnimals}
            sickAnimals={summary.sickAnimals}
            milkKnown={!summary.milkUnavailable}
            controlsKnown={!summary.controlsUnavailable}
            onRegisterMilk={() => setIsMilkModalOpen(true)}
            onScrollToHealth={() => setActiveTab('salud')}
          />

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Milk className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                Ordeño de hoy
              </h2>
              <MilkStats dailyLiters={summary.dailyLiters} weeklyAverage={summary.weeklyAverage} trendPercentage={summary.trendPercentage} animalsMilked={summary.animalsMilked} isLoading={summary.loading} simple />
            </section>

            <section className="rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm sm:p-5">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-bold">
                <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                Salud del ganado
              </h2>
              <ControlStats totalControls={summary.totalControls} sickAnimals={summary.sickAnimals} recentTreatments={summary.recentTreatments} healthyPercentage={summary.healthyPercentage} isLoading={summary.loading} simple />
            </section>
          </div>
        </TabsContent>

        {/* PESTAÑA 2: Ordeño */}
        <TabsContent value="leche" className="mt-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:px-5">
              <div>
                <h2 className="text-base font-bold">Historial de ordeños</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Consulta litros, vaca y turno registrados.</p>
              </div>
              <Button onClick={() => setIsMilkModalOpen(true)} size="sm" className="min-h-11 w-full bg-blue-700 px-4 text-sm font-bold text-white hover:bg-blue-800 min-[420px]:w-auto">
                <Milk className="mr-2 h-4 w-4" aria-hidden="true" /> Registrar ordeño
              </Button>
            </div>
            <div className="p-0"><MilkProductionPage /></div>
          </div>
        </TabsContent>

        {/* PESTAÑA 3: Revisiones */}
        <TabsContent value="salud" className="mt-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-4 min-[420px]:flex-row min-[420px]:items-center min-[420px]:justify-between sm:px-5">
              <div>
                <h2 className="text-base font-bold">Revisiones de salud</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Primero se muestran los animales que necesitan atención.</p>
              </div>
              <Button onClick={() => setIsControlModalOpen(true)} size="sm" className="min-h-11 w-full bg-emerald-700 px-4 text-sm font-bold text-white hover:bg-emerald-800 min-[420px]:w-auto">
                <Stethoscope className="mr-2 h-4 w-4" aria-hidden="true" /> Reportar salud
              </Button>
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

      <GenericModal
        isOpen={isWeightModalOpen}
        onOpenChange={setIsWeightModalOpen}
        title="Registrar peso"
        subtitle="Animal, peso y cómo se veía"
        description="Formulario corto para registrar el pesaje de un animal."
        icon={<Scale className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="amber"
        size="md"
        variant="compact"
        bodyClassName="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-0 pt-3 sm:px-5 sm:pt-4"
        enableBackdropBlur
      >
        <ControlEntryFormWidget
          mode="weight"
          onSuccess={handleWeightSuccess}
          onCancel={() => setIsWeightModalOpen(false)}
        />
      </GenericModal>

      <GenericModal
        isOpen={isMilkModalOpen}
        onOpenChange={setIsMilkModalOpen}
        title="Registrar ordeño"
        subtitle="Vaca, litros y turno"
        description="Formulario para registrar la producción de leche del día."
        icon={<Milk className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="blue"
        size="md"
        variant="compact"
        bodyClassName="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-0 pt-3 sm:px-5 sm:pt-4"
        enableBackdropBlur
      >
        <MilkEntryFormWidget onSuccess={handleMilkSuccess} onCancel={() => setIsMilkModalOpen(false)} />
      </GenericModal>

      <GenericModal
        isOpen={isControlModalOpen}
        onOpenChange={setIsControlModalOpen}
        title="Reportar novedad de salud"
        subtitle="Animal, estado y observación"
        description="Formulario corto para reportar síntomas o cambios de salud."
        icon={<Stethoscope className="h-4 w-4 text-white" aria-hidden="true" />}
        themeColor="emerald"
        size="md"
        variant="compact"
        bodyClassName="flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 pb-0 pt-3 sm:px-5 sm:pt-4"
        enableBackdropBlur
      >
        <ControlEntryFormWidget mode="health" onSuccess={handleControlSuccess} onCancel={() => setIsControlModalOpen(false)} />
      </GenericModal>
    </div>
  );
};

export default AdminControlPage;
