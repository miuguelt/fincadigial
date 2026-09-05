import { useState, useEffect, useCallback } from 'react';
import {
  Heart,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Baby,
  Users,
  RefreshCw,
  Target,
  Sparkles,
  Award,
  ListFilter
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { reproductionService, ReproductionSummary } from '@/entities/reproduction/api/reproduction.service';
import { animalService } from '@/entities/animal/api/animal.service';
import type { ReproductiveEventResponse, ReproductiveEventInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDConfig } from '@/shared/types/crud';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { DataScreenHeader } from '@/widgets/layout/DataScreenHeader';
import { AnimalDetailModal } from '@/widgets/dashboard/animals/AnimalDetailModal';
import { ReproductionBatchModal } from '@/widgets/reproduction/ReproductionBatchModal';
import { OffspringManagementTab } from '@/widgets/reproduction/OffspringManagementTab';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';
import ReproductionCalendar from '@/widgets/reproduction/ReproductionCalendar';
import HeatAlertsWidget from '@/widgets/reproduction/HeatAlertsWidget';
import HerdKpisPage from './HerdKpis';
import FertilityDashboard from './FertilityDashboard';
import SirePerformance from './SirePerformance';
import { useToast } from '@/app/providers/ToastContext';
import { useSearchParams } from 'react-router-dom';

/** Etiqueta del selector: el registro manda, la raza desambigua. */
const animalLabel = (animal: { record: string; breed?: { name?: string } | null }) =>
  animal.breed?.name ? `${animal.record} · ${animal.breed.name}` : animal.record;

const TAB_TRIGGER_CLASS =
  'min-h-12 min-w-0 gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:text-sm transition-all cursor-pointer';

export default function ReproductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'eventos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  const [summary, setSummary] = useState<ReproductionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  // Modales flotantes de acciones rápidas
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Sub-tab para Fertilidad vs Toros
  const [fertilitySubTab, setFertilitySubTab] = useState<'fertility' | 'sires'>('fertility');

  const loadSummaryData = useCallback(async () => {
    setLoadingSummary(true);
    try {
      const data = await reproductionService.getSummary();
      setSummary(data);
    } catch (err) {
      console.error('Error cargando resumen reproductivo:', err);
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  useEffect(() => {
    loadSummaryData();
  }, [loadSummaryData, refreshKey]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setSearchParams({ tab: val });
  };

  const handleDataRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    loadSummaryData();
    showToast('Datos reproductivos actualizados', 'info');
  };

  // Configuración del CRUD de Eventos Reproductivos
  const initialFormData: ReproductiveEventInput = {
    animal_id: 0,
    event_type: 'Celo',
    event_date: new Date().toISOString().split('T')[0],
  };

  const crudConfig: CRUDConfig<ReproductiveEventResponse, ReproductiveEventInput> = {
    entityName: 'Evento Reproductivo',
    title: 'Registro de Eventos Reproductivos',
    searchPlaceholder: 'Buscar por hembra, toro o notas...',
    columns: [
      {
        key: 'animal',
        label: 'Hembra (Vaca/Novilla)',
        render: (val: any, item: ReproductiveEventResponse) => (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (item.animal_id) setSelectedAnimalId(item.animal_id);
            }}
            className="font-bold text-primary hover:underline cursor-pointer flex items-center gap-1"
          >
            {val?.record || `ID #${item.animal_id}`}
          </span>
        ),
      },
      {
        key: 'event_type',
        label: 'Tipo de Evento',
        render: (val: any) => {
          let variant: 'default' | 'outline' | 'secondary' | 'destructive' = 'default';
          switch (val) {
            case 'Celo':
              variant = 'secondary';
              break;
            case 'Inseminacion':
              variant = 'outline';
              break;
            case 'Diagnostico':
              variant = 'default';
              break;
            case 'Parto':
              variant = 'destructive';
              break;
            case 'Secado':
              variant = 'outline';
              break;
          }
          return <Badge variant={variant} className="font-bold text-xs">{val}</Badge>;
        },
      },
      {
        key: 'event_date',
        label: 'Fecha Evento',
        render: (val: any) => (val ? formatDateColombia(val) : '---'),
      },
      {
        key: 'diagnosis_result',
        label: 'Diagnóstico',
        render: (val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Diagnostico') return null;
          const label = val || 'Pendiente';
          return <Badge className={getAutoStatusClass(label)}>{label}</Badge>;
        },
      },
      {
        key: 'expected_birth_date',
        label: 'Fecha Prob. Parto (FPP)',
        render: (val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Inseminacion' && item.event_type !== 'Diagnostico') return null;
          if (!val) return null;
          return (
            <div className="flex flex-col">
              <span className={item.is_overdue ? 'text-destructive font-black' : 'font-semibold'}>
                {formatDateColombia(val)}
              </span>
              {item.days_to_birth !== undefined && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  {item.days_to_birth > 0
                    ? `Faltan ${item.days_to_birth} días`
                    : item.days_to_birth === 0
                    ? '¡Parto Hoy!'
                    : `Vencido por ${Math.abs(item.days_to_birth)} días`}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'sire',
        label: 'Servicio / Macho',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Inseminacion') return null;
          const techniqueLabels: Record<string, string> = {
            Natural: 'Monta Natural',
            Artificial: 'Inseminación Artificial',
            Transferencia_Embrionaria: 'Transferencia de Embrión',
          };
          const techLabel = item.technique ? techniqueLabels[item.technique] || item.technique : '---';
          return (
            <div className="flex flex-col text-xs leading-tight">
              {item.sire?.record ? (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.sire_id) setSelectedAnimalId(item.sire_id);
                  }}
                  className="font-bold text-foreground hover:text-primary cursor-pointer hover:underline"
                >
                  Toro: {item.sire.record}
                </span>
              ) : (
                <span className="text-muted-foreground">Toro: No asignado</span>
              )}
              <span className="text-[11px] text-muted-foreground">{techLabel}</span>
            </div>
          );
        },
      },
      {
        key: 'parto_details',
        label: 'Detalles Parto',
        render: (_val: any, item: ReproductiveEventResponse) => {
          if (item.event_type !== 'Parto') return null;
          return (
            <div className="flex flex-col text-xs leading-tight gap-1">
              <div className="flex items-center gap-2 font-bold">
                <span className="text-emerald-600 dark:text-emerald-400">{item.alive_count ?? 0} Vivas</span>
                <span className="text-rose-500">{item.dead_count ?? 0} Muertas</span>
              </div>
              {item.complications && (
                <Badge variant="destructive" className="text-[11px] px-1.5 py-0 font-bold w-fit">
                  Complicaciones
                </Badge>
              )}
            </div>
          );
        },
      },
      {
        key: 'notes',
        label: 'Observaciones',
        render: (val: any) =>
          val ? (
            <span className="text-xs text-muted-foreground max-w-[200px] fit-clamp block" title={val}>
              {val}
            </span>
          ) : (
            '---'
          ),
      },
    ],
    formSections: [
      {
        title: 'Datos Principales del Evento',
        fields: [
          {
            name: 'animal_id',
            label: 'Hembra (Vaca o Novilla)',
            type: 'select',
            required: true,
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Hembra' });
              return animals.map((a) => ({ label: animalLabel(a), value: a.id }));
            },
          },
          {
            name: 'event_type',
            label: 'Tipo de Evento',
            type: 'select',
            required: true,
            options: [
              { label: 'Celo Detectado', value: 'Celo' },
              { label: 'Inseminación / Monta', value: 'Inseminacion' },
              { label: 'Diagnóstico de Preñez (Palpación)', value: 'Diagnostico' },
              { label: 'Parto', value: 'Parto' },
              { label: 'Secado (Cierre de Lactancia)', value: 'Secado' },
            ],
          },
          {
            name: 'event_date',
            label: 'Fecha del Evento',
            type: 'date',
            required: true,
          },
        ],
      },
      {
        title: 'Detalles de Inseminación / Monta',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Inseminacion',
        fields: [
          {
            name: 'technique',
            label: 'Técnica Empleada',
            type: 'select',
            options: [
              { label: 'Inseminación Artificial (Pajilla)', value: 'Artificial' },
              { label: 'Monta Natural', value: 'Natural' },
              { label: 'Transferencia de Embrión', value: 'Transferencia_Embrionaria' },
            ],
          },
          {
            name: 'sire_id',
            label: 'Toro Reproductor (Padre)',
            type: 'select',
            loadOptions: async () => {
              const animals = await animalService.getAll({ sex: 'Macho' });
              return animals.map((a) => ({ label: animalLabel(a), value: a.id }));
            },
          },
        ],
      },
      {
        title: 'Resultado de Palpación / Diagnóstico',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Diagnostico',
        fields: [
          {
            name: 'diagnosis_result',
            label: 'Resultado',
            type: 'select',
            options: [
              { label: 'Positivo (Confirmada Preñada)', value: 'Positivo' },
              { label: 'Negativo (Vacía / No Preñada)', value: 'Negativo' },
              { label: 'Pendiente (Repetir en 15 días)', value: 'Pendiente' },
            ],
          },
        ],
      },
      {
        title: 'Información del Parto',
        showIf: (data: ReproductiveEventInput) => data.event_type === 'Parto',
        fields: [
          {
            name: 'alive_count',
            label: 'Crías Nacidas Vivas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'dead_count',
            label: 'Crías Nacidas Muertas',
            type: 'number',
            validation: { min: 0 },
          },
          {
            name: 'complications',
            label: '¿Hubo complicaciones o distocia?',
            type: 'checkbox',
          },
        ],
      },
      {
        title: 'Observaciones y Notas',
        fields: [
          {
            name: 'notes',
            label: 'Notas del Evento',
            type: 'textarea',
          },
        ],
      },
    ],
    enableEditModal: true,
    enableDelete: true,
    enableDetailModal: true,
    themeColor: 'purple',
    onAfterCreate: () => handleDataRefresh(),
    onAfterUpdate: () => handleDataRefresh(),
    onAfterDelete: () => handleDataRefresh(),
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-4 sm:p-6 lg:p-8 space-y-6 overflow-x-hidden">
      {/* Header Principal con Acciones Rápidas */}
      <DataScreenHeader
        icon={<Heart className="h-5 w-5 text-white" />}
        iconClassName="from-purple-600 to-indigo-600 shadow-purple-600/20"
        title={<>Gestión <span className="text-purple-600 dark:text-purple-400">Reproductiva</span></>}
        description="Centro integral de celos, servicios, partos, fertilidad y descendencia del hato"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchModalOpen(true)}
              className="h-9 gap-2 rounded-lg font-bold border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
            >
              <Users className="h-4 w-4 text-purple-600" />
              Jornada por Lote
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCalvingModalOpen(true)}
              className="h-9 gap-2 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20"
            >
              <Baby className="h-4 w-4" />
              Parto Asistido & Cría
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Preñeces Activas */}
        <Card className="border-border/50 border-l-4 border-l-purple-500 bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Preñeces Activas
            </CardDescription>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Heart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
              {loadingSummary ? '...' : summary?.active_pregnancies ?? 0}
            </CardTitle>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              Hembras gestantes confirmadas
            </p>
          </CardContent>
        </Card>

        {/* Partos Próximos (30 días) */}
        <Card className={`border-border/50 border-l-4 ${
          (summary?.overdue_births ?? 0) > 0 ? 'border-l-rose-500' : 'border-l-blue-500'
        } bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden`}>
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Partos Próximos (30d)
            </CardDescription>
            <div className={`p-2 rounded-lg ${
              (summary?.overdue_births ?? 0) > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
                {loadingSummary ? '...' : summary?.births_next_30_days ?? 0}
              </CardTitle>
              {(summary?.overdue_births ?? 0) > 0 && (
                <Badge variant="destructive" className="text-[11px] font-black px-1.5 py-0">
                  {summary?.overdue_births} vencidos
                </Badge>
              )}
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              Maternidad y preparación de potrero
            </p>
          </CardContent>
        </Card>

        {/* Tasa de Concepción */}
        <Card className="border-border/50 border-l-4 border-l-emerald-500 bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tasa de Concepción
            </CardDescription>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
              {loadingSummary ? '...' : `${summary?.conception_rate_pct ?? 0}%`}
            </CardTitle>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              Efectividad sobre servicios resueltos
            </p>
          </CardContent>
        </Card>

        {/* Crías Nacidas */}
        <Card className="border-border/50 border-l-4 border-l-teal-500 bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="pb-1 flex flex-row items-center justify-between">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Nacimientos del Hato
            </CardDescription>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
              <Baby className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-baseline gap-2">
              <CardTitle className="text-2xl sm:text-3xl font-black text-foreground">
                {loadingSummary ? '...' : summary?.total_alive_offspring ?? 0}
              </CardTitle>
              <span className="text-xs text-muted-foreground font-semibold">vivas</span>
            </div>
            <p className="text-[11px] font-semibold text-muted-foreground mt-1">
              Total nacimientos: {summary?.total_births ?? 0} partos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por Pestañas del Hub Reproductivo */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="mb-6 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1.5 md:grid-cols-6">
          <TabsTrigger value="eventos" className={TAB_TRIGGER_CLASS}>
            <ListFilter className="h-4 w-4 text-purple-600" />
            Eventos
          </TabsTrigger>
          <TabsTrigger value="calendario" className={TAB_TRIGGER_CLASS}>
            <Calendar className="h-4 w-4 text-indigo-600" />
            Agenda
          </TabsTrigger>
          <TabsTrigger value="alertas" className={TAB_TRIGGER_CLASS}>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            Alertas Celo
          </TabsTrigger>
          <TabsTrigger value="indicadores" className={TAB_TRIGGER_CLASS}>
            <Target className="h-4 w-4 text-pink-600" />
            Indicadores
          </TabsTrigger>
          <TabsTrigger value="fertilidad" className={TAB_TRIGGER_CLASS}>
            <Award className="h-4 w-4 text-blue-600" />
            Fertilidad / Toros
          </TabsTrigger>
          <TabsTrigger value="crias" className={TAB_TRIGGER_CLASS}>
            <Baby className="h-4 w-4 text-emerald-600" />
            Crías
          </TabsTrigger>
        </TabsList>

        {/* PESTAÑA 1: Eventos Reproductivos CRUD */}
        <TabsContent value="eventos" className="mt-0">
          <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
            <AdminCRUDPage
              config={crudConfig}
              service={reproductionService}
              initialFormData={initialFormData}
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
              <HeatAlertsWidget />
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

        {/* PESTAÑA 4: Indicadores del Hato (IEP, Días Abiertos) */}
        <TabsContent value="indicadores" className="mt-0">
          <HerdKpisPage isEmbedded />
        </TabsContent>

        {/* PESTAÑA 5: Fertilidad y Toros */}
        <TabsContent value="fertilidad" className="mt-0 space-y-4">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <Button
              variant={fertilitySubTab === 'fertility' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFertilitySubTab('fertility')}
              className="h-9 gap-2 font-bold rounded-lg"
            >
              <Heart className="h-4 w-4" />
              Auditoría de Fertilidad
            </Button>
            <Button
              variant={fertilitySubTab === 'sires' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFertilitySubTab('sires')}
              className="h-9 gap-2 font-bold rounded-lg"
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

      {/* Modal: Parto Asistido */}
      <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto rounded-2xl border border-border shadow-2xl">
          <DialogHeader className="p-6 pb-3 border-b bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Baby className="h-5 w-5" />
              Registrar Parto Asistido & Cría
            </DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <AssistedCalvingForm
              onComplete={() => {
                setIsCalvingModalOpen(false);
                handleDataRefresh();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Registro Masivo por Lote */}
      <ReproductionBatchModal
        isOpen={isBatchModalOpen}
        onOpenChange={setIsBatchModalOpen}
        onSuccess={() => handleDataRefresh()}
      />

      {/* Modal de Detalle Animal */}
      {selectedAnimalId && (
        <AnimalDetailModal
          isOpen={Boolean(selectedAnimalId)}
          onOpenChange={(open) => {
            if (!open) setSelectedAnimalId(null);
          }}
          animalId={selectedAnimalId}
        />
      )}
    </div>
  );
}
