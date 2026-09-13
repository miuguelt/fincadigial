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
  ListFilter,
  Eye,
  Plus,
} from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/shared/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/ui/dialog';
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
import { ReproductiveEventQuickModal, type EventTypeOption } from '@/widgets/reproduction/ReproductiveEventQuickModal';
import { OffspringManagementTab } from '@/widgets/reproduction/OffspringManagementTab';
import AssistedCalvingForm from '@/widgets/reproduction/AssistedCalvingForm';
import ReproductionCalendar from '@/widgets/reproduction/ReproductionCalendar';
import HeatAlertsWidget from '@/widgets/reproduction/HeatAlertsWidget';
import HerdKpisPage from './HerdKpis';
import FertilityDashboard from './FertilityDashboard';
import SirePerformance from './SirePerformance';
import { useToast } from '@/app/providers/ToastContext';
import { useSearchParams, useLocation } from 'react-router-dom';

/** Etiqueta del selector: el registro manda, la raza desambigua. */
const animalLabel = (animal: { record: string; breed?: { name?: string } | null }) =>
  animal.breed?.name ? `${animal.record} · ${animal.breed.name}` : animal.record;

const TAB_TRIGGER_CLASS =
  'min-h-11 min-w-0 gap-1.5 rounded-xl px-2 py-2 text-[11px] font-bold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm sm:px-3 sm:text-sm transition-all cursor-pointer';

export default function ReproductionHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const initialTab = searchParams.get('tab') || 'eventos';
  const [activeTab, setActiveTab] = useState(initialTab);
  const { showToast } = useToast();

  const urlAnimalId = searchParams.get('animal_id');
  const filterAnimalId = urlAnimalId ? Number(urlAnimalId) : null;

  const [summary, setSummary] = useState<ReproductionSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [selectedAnimalId, setSelectedAnimalId] = useState<number | null>(null);

  // Modales flotantes de acciones rápidas
  const [isCalvingModalOpen, setIsCalvingModalOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Modal rápido de novedad reproductiva (campo/potrero)
  const [isQuickEventModalOpen, setIsQuickEventModalOpen] = useState(false);
  const [quickEventAnimalId, setQuickEventAnimalId] = useState<number | null>(filterAnimalId);
  const [quickEventAnimalRecord, setQuickEventAnimalRecord] = useState<string | null>(null);
  const [quickEventDefaultType, setQuickEventDefaultType] = useState<EventTypeOption>('Celo');

  // Sub-tab para Fertilidad vs Toros
  const [fertilitySubTab, setFertilitySubTab] = useState<'fertility' | 'sires'>('fertility');

  // Precarga automática desde navegación externa (ej. HeatAlertsWidget o links con state)
  useEffect(() => {
    const routeState = location.state as { preselectAnimal?: number; animalRecord?: string; eventType?: EventTypeOption } | null;
    if (routeState?.preselectAnimal) {
      setQuickEventAnimalId(routeState.preselectAnimal);
      if (routeState.animalRecord) setQuickEventAnimalRecord(routeState.animalRecord);
      if (routeState.eventType) setQuickEventDefaultType(routeState.eventType);
      setIsQuickEventModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab') || 'eventos';
    if (tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams, activeTab]);

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

  const mapResponseToForm = (item: ReproductiveEventResponse): ReproductiveEventInput => ({
    animal_id: item.animal_id,
    event_type: item.event_type as any,
    event_date: item.event_date ? item.event_date.split('T')[0] : '',
    technique: item.technique,
    sire_id: item.sire_id,
    diagnosis_result: item.diagnosis_result,
    alive_count: item.alive_count ?? 0,
    dead_count: item.dead_count ?? 0,
    complications: item.complications,
    notes: item.notes || '',
  });

  const validateForm = (formData: ReproductiveEventInput): string | null => {
    if (formData.event_type === 'Parto') {
      const alive = formData.alive_count || 0;
      const dead = formData.dead_count || 0;
      if (alive + dead <= 0) {
        return 'Para registrar un parto, debe indicar al menos 1 cría nacida (viva o muerta).';
      }
    }
    return null;
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-background via-background to-muted/20 p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden">
      {/* Header Principal con Acciones Rápidas */}
      <DataScreenHeader
        icon={<Heart className="h-5 w-5 text-white" />}
        iconClassName="from-purple-600 to-indigo-600 shadow-purple-600/20"
        title={<>Gestión <span className="text-purple-600 dark:text-purple-400">Reproductiva</span></>}
        description="Centro integral de celos, servicios, partos, fertilidad y descendencia del ganado"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setQuickEventAnimalId(filterAnimalId);
                setQuickEventAnimalRecord(null);
                setQuickEventDefaultType('Celo');
                setIsQuickEventModalOpen(true);
              }}
              className="h-9 w-full gap-2 rounded-lg font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-md shadow-purple-600/20 sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              <span className="sm:hidden">Nueva Novedad</span>
              <span className="hidden sm:inline">+ Novedad Reproductiva</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBatchModalOpen(true)}
              className="h-9 w-full gap-2 rounded-lg font-bold border-purple-500/30 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 sm:w-auto"
            >
              <Users className="h-4 w-4 text-purple-600" />
              <span className="sm:hidden">Jornada por lote</span>
              <span className="hidden sm:inline">Jornada por Lote</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCalvingModalOpen(true)}
              className="h-9 w-full gap-2 rounded-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-600/20 sm:w-auto"
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
        {/* Preñeces Activas */}
        <Card className="border-border/50 border-l-4 border-l-purple-500 bg-card/50 backdrop-blur-sm shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-5 sm:pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Preñeces Activas
            </CardDescription>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600">
              <Heart className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
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
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-5 sm:pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Partos Próximos (30d)
            </CardDescription>
            <div className={`p-2 rounded-lg ${
              (summary?.overdue_births ?? 0) > 0 ? 'bg-rose-500/10 text-rose-600' : 'bg-blue-500/10 text-blue-600'
            }`}>
              <Calendar className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
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
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-5 sm:pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Tasa de Concepción
            </CardDescription>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
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
          <CardHeader className="flex flex-row items-center justify-between p-3 pb-1 sm:p-5 sm:pb-1">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Nacimientos del Ganado
            </CardDescription>
            <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
              <Baby className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 pt-0 sm:p-5 sm:pt-0">
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
        <TabsList className="mb-4 grid h-auto w-full grid-cols-2 gap-1 rounded-2xl border border-border bg-muted/60 p-1 sm:mb-6 sm:grid-cols-3 lg:grid-cols-6">
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

      {/* Modal: Parto Asistido */}
      <Dialog open={isCalvingModalOpen} onOpenChange={setIsCalvingModalOpen}>
        <DialogContent
          fullWidth
          className="assisted-calving-dialog flex max-h-[calc(100dvh-0.75rem)] w-[calc(100vw-0.75rem)] max-w-[1180px] flex-col gap-0 overflow-hidden rounded-2xl border border-border p-0 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100vw-2rem)]"
          closeButtonClassName="bg-black/10 text-white hover:bg-black/20 hover:text-white"
        >
          <DialogHeader className="shrink-0 border-b bg-gradient-to-r from-emerald-600 to-teal-600 p-4 pb-3 pr-14 text-left text-white sm:p-5 sm:pr-16 lg:px-6 lg:py-5">
            <DialogTitle className="flex items-start gap-2 text-lg font-bold leading-tight sm:items-center sm:text-xl">
              <Baby className="mt-0.5 h-5 w-5 shrink-0 sm:mt-0" />
              Registrar Parto Asistido & Cría
            </DialogTitle>
            <DialogDescription className="mt-1 text-xs font-medium leading-relaxed text-emerald-100/90">
              Protocolo veterinario post-parto, atención del neonato y alta en inventario
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5 lg:p-6">
            <AssistedCalvingForm
              onComplete={() => {
                setIsCalvingModalOpen(false);
                handleDataRefresh();
              }}
              onCancel={() => setIsCalvingModalOpen(false)}
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

      {/* Modal Rápido de Novedad Reproductiva */}
      <ReproductiveEventQuickModal
        isOpen={isQuickEventModalOpen}
        onOpenChange={setIsQuickEventModalOpen}
        defaultAnimalId={quickEventAnimalId}
        defaultAnimalRecord={quickEventAnimalRecord}
        defaultEventType={quickEventDefaultType}
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
