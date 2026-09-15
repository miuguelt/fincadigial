import { Award, Baby, Calendar, Eye, Heart, ListFilter, Plus, RefreshCw, Sparkles, Target, TrendingUp, Users, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { KPICard } from '@/shared/ui/KPICard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { reproductionService, type ReproductionSummary } from '@/entities/reproduction/api/reproduction.service';
import type { ReproductiveEventInput, ReproductiveEventResponse } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import HeatAlertsWidget from '@/widgets/reproduction/HeatAlertsWidget';
import ReproductionCalendar from '@/widgets/reproduction/ReproductionCalendar';
import HerdKpisPage from './HerdKpis';
import FertilityDashboard from './FertilityDashboard';
import SirePerformance from './SirePerformance';
import { OffspringManagementTab } from '@/widgets/reproduction/OffspringManagementTab';
import { ReproductionHubModals } from './ReproductionHubModals';
import type { EventTypeOption } from '@/widgets/reproduction/ReproductiveEventQuickModal';

interface ReproductionHubViewProps {
  summary: ReproductionSummary | null;
  loadingSummary: boolean;
  activeTab: string;
  handleTabChange: (value: string) => void;
  filterAnimalId: number | null;
  searchParams: URLSearchParams;
  setSearchParams: (params: URLSearchParams) => void;
  setSelectedAnimalId: (id: number | null) => void;
  crudConfig: CRUDConfig<ReproductiveEventResponse, ReproductiveEventInput>;
  initialFormData: ReproductiveEventInput;
  mapResponseToForm: (item: ReproductiveEventResponse) => ReproductiveEventInput;
  validateForm: (formData: ReproductiveEventInput) => string | null;
  handleDataRefresh: () => void;
  fertilitySubTab: 'fertility' | 'sires';
  setFertilitySubTab: (value: 'fertility' | 'sires') => void;
  isCalvingModalOpen: boolean;
  setIsCalvingModalOpen: (open: boolean) => void;
  isBatchModalOpen: boolean;
  setIsBatchModalOpen: (open: boolean) => void;
  isQuickEventModalOpen: boolean;
  setIsQuickEventModalOpen: (open: boolean) => void;
  quickEventAnimalId: number | null;
  quickEventAnimalRecord: string | null;
  quickEventDefaultType: EventTypeOption;
  setQuickEventAnimalId: (id: number | null) => void;
  setQuickEventAnimalRecord: (record: string | null) => void;
  setQuickEventDefaultType: (type: EventTypeOption) => void;
  selectedAnimalId: number | null;
}

const TAB_TRIGGER_CLASS = 'min-h-11 min-w-0 gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:px-3 sm:text-sm transition-all cursor-pointer';

export function ReproductionHubView({
  summary, loadingSummary, activeTab, handleTabChange, filterAnimalId, searchParams, setSearchParams, setSelectedAnimalId,
  crudConfig, initialFormData, mapResponseToForm, validateForm, handleDataRefresh, fertilitySubTab, setFertilitySubTab,
  isCalvingModalOpen, setIsCalvingModalOpen, isBatchModalOpen, setIsBatchModalOpen, isQuickEventModalOpen, setIsQuickEventModalOpen,
  quickEventAnimalId, quickEventAnimalRecord, quickEventDefaultType, setQuickEventAnimalId, setQuickEventAnimalRecord, setQuickEventDefaultType, selectedAnimalId,
}: ReproductionHubViewProps) {
  return (
    <div className="min-h-full bg-background p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header Principal con Acciones Rápidas */}
      <DataScreenHeader
        icon={<Heart className="h-5 w-5" />}
        iconColor="primary"
        title="Gestión Reproductiva"
        description="Centro integral de celos, servicios, partos, fertilidad y descendencia del ganado"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setQuickEventAnimalId(filterAnimalId);
                setQuickEventAnimalRecord(null);
                setQuickEventDefaultType('Celo');
                setIsQuickEventModalOpen(true);
              }}
              className="h-9 w-full gap-2 rounded-lg font-bold sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Nueva Novedad</span>
              <span className="hidden sm:inline">+ Novedad Reproductiva</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchModalOpen(true)}
              className="h-9 w-full gap-2 rounded-lg font-bold sm:w-auto"
            >
              <Users className="h-4 w-4" />
              <span className="sm:hidden">Jornada por lote</span>
              <span className="hidden sm:inline">Jornada por Lote</span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsCalvingModalOpen(true)}
              className="h-9 w-full gap-2 rounded-lg font-bold sm:w-auto"
            >
              <Baby className="h-4 w-4" />
              <span className="sm:hidden">Registrar parto</span>
              <span className="hidden sm:inline">Parto Asistido & Cría</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleDataRefresh}
              className="h-9 w-9 rounded-lg"
              title="Actualizar datos"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        }
      />

      {/* KPI Cards Bento (Métricas Clave de Reproducción) */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <KPICard
          label="Preñeces Activas"
          value={loadingSummary ? '...' : summary?.active_pregnancies ?? 0}
          subtitle="Hembras gestantes confirmadas"
          icon={Heart}
          status="info"
        />

        <KPICard
          label="Partos Próximos (30d)"
          value={loadingSummary ? '...' : summary?.births_next_30_days ?? 0}
          subtitle="Maternidad y preparación de potrero"
          icon={Calendar}
          status={(summary?.overdue_births ?? 0) > 0 ? 'danger' : 'info'}
          extra={
            (summary?.overdue_births ?? 0) > 0 ? (
              <Badge variant="destructive" className="text-[11px] font-black px-1.5 py-0">
                {summary?.overdue_births} vencidos
              </Badge>
            ) : undefined
          }
        />

        <KPICard
          label="Tasa de Concepción"
          value={loadingSummary ? '...' : `${summary?.conception_rate_pct ?? 0}%`}
          subtitle="Efectividad sobre servicios resueltos"
          icon={TrendingUp}
          status="success"
        />

        <KPICard
          label="Nacimientos del Ganado"
          value={loadingSummary ? '...' : summary?.total_alive_offspring ?? 0}
          subtitle={`Total nacimientos: ${summary?.total_births ?? 0} partos`}
          icon={Baby}
          status="success"
          extra={<span className="text-xs text-muted-foreground font-semibold">vivas</span>}
        />
      </div>

      {/* Navegación por Pestañas del Hub Reproductivo */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1 sm:mb-6 sm:grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="eventos" className={TAB_TRIGGER_CLASS}>
            <ListFilter className="h-4 w-4" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="calendario" className={TAB_TRIGGER_CLASS}>
            <Calendar className="h-4 w-4" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="alertas" className={TAB_TRIGGER_CLASS}>
            <AlertTriangle className="h-4 w-4" />
            Alertas Celo
          </TabsTrigger>
          <TabsTrigger value="indicadores" className={TAB_TRIGGER_CLASS}>
            <Target className="h-4 w-4" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="fertilidad" className={TAB_TRIGGER_CLASS}>
            <Award className="h-4 w-4" />
            Fertilidad / Toros
          </TabsTrigger>
          <TabsTrigger value="crias" className={TAB_TRIGGER_CLASS}>
            <Baby className="h-4 w-4" />
            Crías
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: Eventos Reproductivos CRUD */}
        <TabsContent value="eventos" className="mt-0 space-y-3">
          {filterAnimalId && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-foreground">
              <div className="flex items-center gap-2.5">
                <Badge variant="outline" className="bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30 font-black">
                  Filtro por Animal
                </Badge>
                <span className="text-xs sm:text-sm font-bold">
                  Historial reproductivo del animal Arete #{filterAnimalId}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedAnimalId(filterAnimalId)}
                  className="h-8 text-xs font-bold gap-1 rounded-xl"
                >
                  <Eye className="h-3.5 w-3.5 text-purple-600" />
                  Ver Ficha Animal
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('animal_id');
                    setSearchParams(newParams);
                  }}
                  className="h-8 text-xs font-bold text-muted-foreground hover:text-foreground rounded-xl"
                >
                  Quitar filtro (Ver todo el ganado)
                </Button>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <AdminCRUDPage
              config={crudConfig}
              service={reproductionService}
              initialFormData={initialFormData}
              mapResponseToForm={mapResponseToForm}
              validateForm={validateForm}
              filters={filterAnimalId ? { animal_id: filterAnimalId } : undefined}
            />
          </div>
        </TabsContent>

        {/* PESTAÑA 2: Calendario y Agenda */}
        <TabsContent value="calendario" className="mt-0">
          <ReproductionCalendar />
        </TabsContent>

        {/* PESTAÑA 3: Alertas y Celo */}
        <TabsContent value="alertas" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <HeatAlertsWidget
                onRegisterHeat={(animalId, record) => {
                  setQuickEventAnimalId(animalId);
                  setQuickEventAnimalRecord(record || null);
                  setQuickEventDefaultType('Celo');
                  setIsQuickEventModalOpen(true);
                }}
              />
            </div>
            <div className="lg:col-span-2">
              <Card className="border-border/60 rounded-2xl bg-card/60 backdrop-blur-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-amber-500" />
                    Protocolo de Detección de Celos
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Guía de observación matutina y vespertina en potrero
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/10 text-foreground space-y-1">
                    <p className="font-bold text-amber-700 dark:text-amber-400">Ciclo Estral Bovino: 21 días promedio (ventana 18 a 24 días)</p>
                    <p className="text-muted-foreground">
                      La vaca que entra en celo presenta inquietud, brama, monta a otras y se deja montar.
                      El momento óptimo de inseminación es 12 horas después del inicio del celo detectado (Regla Mañana-Tarde).
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="font-bold text-foreground block mb-1">Celo en la Mañana:</span>
                      Inseminar o dar monta en la tarde del mismo día (4:00 PM a 6:00 PM).
                    </div>
                    <div className="p-3 rounded-xl bg-muted/40 border border-border">
                      <span className="font-bold text-foreground block mb-1">Celo en la Tarde:</span>
                      Inseminar o dar monta a primera hora de la mañana siguiente (6:00 AM a 8:00 AM).
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* PESTAÑA 4: Indicadores del Ganado (IEP, Días Abiertos) */}
        <TabsContent value="indicadores" className="mt-0">
          <HerdKpisPage isEmbedded />
        </TabsContent>

        {/* PESTAÑA 5: Fertilidad y Toros */}
        <TabsContent value="fertilidad" className="mt-0 space-y-4">
          <div className="grid grid-cols-2 gap-2 border-b border-border pb-3 sm:flex sm:items-center">
            <Button
              variant={fertilitySubTab === 'fertility' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFertilitySubTab('fertility')}
              className="h-10 min-w-0 gap-1.5 rounded-lg px-2 text-xs font-bold sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Heart className="h-4 w-4" />
              Auditoría de Fertilidad
            </Button>
            <Button
              variant={fertilitySubTab === 'sires' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFertilitySubTab('sires')}
              className="h-10 min-w-0 gap-1.5 rounded-lg px-2 text-xs font-bold sm:h-9 sm:gap-2 sm:px-3 sm:text-sm"
            >
              <Award className="h-4 w-4" />
              Desempeño de Toros (Sires)
            </Button>
          </div>

          {fertilitySubTab === 'fertility' ? (
            <FertilityDashboard isEmbedded />
          ) : (
            <SirePerformance isEmbedded />
          )}
        </TabsContent>

        {/* PESTAÑA 6: Crías y Nacimientos */}
        <TabsContent value="crias" className="mt-0">
          <OffspringManagementTab />
        </TabsContent>
      </Tabs>
      <ReproductionHubModals
        isCalvingModalOpen={isCalvingModalOpen}
        setIsCalvingModalOpen={setIsCalvingModalOpen}
        isBatchModalOpen={isBatchModalOpen}
        setIsBatchModalOpen={setIsBatchModalOpen}
        isQuickEventModalOpen={isQuickEventModalOpen}
        setIsQuickEventModalOpen={setIsQuickEventModalOpen}
        quickEventAnimalId={quickEventAnimalId}
        quickEventAnimalRecord={quickEventAnimalRecord}
        quickEventDefaultType={quickEventDefaultType}
        handleDataRefresh={handleDataRefresh}
        selectedAnimalId={selectedAnimalId}
        setSelectedAnimalId={setSelectedAnimalId}
      />
    </div>
  );
}
