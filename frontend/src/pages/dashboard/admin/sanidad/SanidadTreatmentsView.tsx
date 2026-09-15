import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Activity, AlertTriangle, Calendar, FileHeart, Filter, Sparkles, Stethoscope, X } from 'lucide-react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDConfig } from '@/shared/types/crud';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';
import { TreatmentSuppliesModal } from '@/widgets/dashboard/treatments/TreatmentSuppliesModal';
import { TreatmentDetailModalContent } from '@/widgets/dashboard/treatments/TreatmentDetailModalContent';
import { HealthInterventionWizard } from '@/widgets/dashboard/treatments/HealthInterventionWizard';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn';
import { SanidadModuleHeader, SanidadView } from './SanidadModuleHeader';
import { buildTreatmentsColumns } from './SanidadTreatmentsColumns';
import {
  buildInitialFormData,
  buildTreatmentFilterItems,
  buildTreatmentsFormSections,
  mapResponseToForm,
  validateForm,
  TreatmentRow,
  TreatmentQuickFilter,
} from './sanidadTreatmentsConfig';
import type { SanidadStatsData } from './useSanidadStats';

const TOOLBAR_TABS: Array<{ id: TreatmentQuickFilter; label: string; icon: any; warn?: boolean }> = [
  { id: 'todos', label: 'Todos', icon: Activity },
  { id: 'retiro', label: 'En retiro', icon: AlertTriangle, warn: true },
  { id: 'recientes', label: 'Últ. 30 días', icon: Calendar },
  { id: 'con_costo', label: 'Con inversión', icon: Filter },
];

interface SanidadTreatmentsViewProps {
  stats: SanidadStatsData;
  refreshStats: () => void;
  caseFilter: number | null;
  onClearCaseFilter: () => void;
  onOpenCase: (caseId: number) => void;
  onViewChange: (view: SanidadView) => void;
}

/**
 * Vista «Tratamientos» del Módulo Sanidad: registros de aplicación sanitaria
 * con vínculo opcional a su caso clínico, filtros rápidos funcionales y
 * acceso directo al seguimiento del caso al que pertenecen.
 */
export const SanidadTreatmentsView: React.FC<SanidadTreatmentsViewProps> = ({
  stats,
  refreshStats,
  caseFilter,
  onClearCaseFilter,
  onOpenCase,
  onViewChange,
}) => {
  const { showToast } = useToast();
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;

  const [animalOptions, setAnimalOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [animalsMap, setAnimalsMap] = useState<Map<number, any>>(new Map());
  const [userOptions, setUserOptions] = useState<Array<{ value: number; label: string }>>([]);
  const [userMap, setUserMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [lookupError, setLookupError] = useState(false);
  const [lookupRetryKey, setLookupRetryKey] = useState(0);

  const [assocOpen, setAssocOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentRow | null>(null);
  const [currentItems, setCurrentItems] = useState<TreatmentRow[]>([]);

  const [activeFilterTab, setActiveFilterTab] = useState<TreatmentQuickFilter>('todos');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [frequentDiagnosticsExpanded, setFrequentDiagnosticsExpanded] = useState(false);

  useEffect(() => {
    // El vínculo desde un caso debe mostrar todos sus tratamientos, aunque
    // antes se hubiera usado un filtro rápido distinto.
    setActiveFilterTab('todos');
  }, [caseFilter]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setLookupError(false);
      try {
        const res: any = await animalsService.getAnimals?.();
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        const aMap = new Map<number, any>();
        const aOpts = (items || []).map((a: any) => {
          aMap.set(a.id, a);
          return { value: a.id, label: a.record || a.tag || `ID ${a.id}` };
        });
        setAnimalsMap(aMap);
        setAnimalOptions(aOpts);
      } catch {
        setLookupError(true);
        showToast('Error al cargar animales', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [lookupRetryKey, showToast]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetchAssignableUsers(currentRole, { limit: 200 }, user).catch(() => []);
        if (!isMounted) return;
        const uMap = new Map<number, string>();
        const uOpts = (res || []).map((u: any) => {
          uMap.set(u.id, u.fullname || u.name || `Usuario #${u.id}`);
          return { value: u.id, label: u.fullname || u.name || `Usuario #${u.id}` };
        });
        setUserMap(uMap);
        setUserOptions(uOpts);
      } catch {
        // Carga en segundo plano no crítica
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [currentRole, user]);

  const animalMap = useMemo(() => {
    const map = new Map<number, string>();
    animalOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const openAssociations = useCallback((item: TreatmentRow) => {
    setSelectedTreatment(item);
    setAssocOpen(true);
  }, []);

  const closeAssociations = useCallback(() => {
    setAssocOpen(false);
    setSelectedTreatment(null);
  }, []);

  const handleTreatmentCreated = useCallback(() => {
    refreshStats();
  }, [refreshStats]);

  const columns = useMemo(
    () => buildTreatmentsColumns({ animalMap, animalsMap, userMap, openAssociations, stats, onOpenCase }),
    [animalMap, animalsMap, userMap, openAssociations, stats, onOpenCase]
  );

  const formSections = useMemo(
    () => buildTreatmentsFormSections({ animalOptions, userOptions, episodeOptions: stats.episodeOptions }),
    [animalOptions, userOptions, stats.episodeOptions]
  );

  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {};
    currentItems.forEach((item) => {
      const diag = ((item as any).diagnosis || item.description || '').trim();
      if (diag) counts[diag] = (counts[diag] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [currentItems]);

  const filterItems = useMemo(() => buildTreatmentFilterItems(activeFilterTab), [activeFilterTab]);

  const crudConfig: CRUDConfig<TreatmentRow, any> = {
    title: 'Tratamientos',
    headerDescription: 'Aplicación, retiros e inversión de la atención sanitaria',
    entityName: 'Tratamiento',
    mobileTitleColumn: 'diagnosis',
    mobileHighlightColumn: 'animal_id',
    mobileColumns: ['treatment_date', 'animal_disease_id', 'dosis', 'withdrawal_days', 'cost', 'performed_by'],
    toolbarPlacement: 'row',
    customToolbar: (
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        {caseFilter ? (
          <div className="flex items-center gap-2 p-1 px-2.5 rounded-xl bg-purple-500/10 border border-purple-500/25">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-700 dark:text-purple-300">
              <FileHeart className="h-3.5 w-3.5" />
              Mostrando caso #{caseFilter}
            </span>
            <button
              type="button"
              onClick={onClearCaseFilter}
              className="h-6 px-2 rounded-lg bg-background/60 border border-border/40 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="h-3 w-3" />
              Ver todos
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 p-1 bg-muted/60 backdrop-blur-md rounded-xl border border-border/40 overflow-x-auto no-scrollbar">
            {TOOLBAR_TABS.map((tab) => {
              const isActive = activeFilterTab === tab.id;
              const Icon = tab.icon;
              const count =
                tab.id === 'todos'
                  ? stats.treatments.total
                  : tab.id === 'retiro'
                    ? stats.treatments.activeWithdrawals
                    : tab.id === 'recientes'
                      ? stats.treatments.recent30d
                      : undefined;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilterTab(tab.id)}
                  aria-pressed={isActive}
                  className={cn(
                    'flex h-7 sm:h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold shrink-0 transition-all cursor-pointer',
                    isActive ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60' : 'text-muted-foreground hover:bg-background/50'
                  )}
                >
                  <Icon className={cn('h-3.5 w-3.5', tab.warn && 'text-amber-500')} />
                  <span>{tab.label}</span>
                  {count !== undefined && (
                    <span className={cn('rounded-full px-1.5 py-0.5 text-[11px] font-black', isActive ? 'bg-muted/60' : 'bg-background/50')}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => setWizardOpen(true)}
          className="h-8 sm:h-9 px-3 sm:px-3.5 rounded-xl border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-xs gap-1.5 shadow-sm ml-auto cursor-pointer"
          title="Abrir asistente clínico de tratamiento guiado"
        >
          <Sparkles className="h-4 w-4 text-purple-500" />
          <span className="hidden sm:inline">Asistente clínico</span>
          <span className="sm:hidden">Asistente</span>
        </Button>
      </div>
    ),
    customHeader: (
      <div className="space-y-3">
        <SanidadModuleHeader view="tratamientos" stats={stats} onViewChange={onViewChange} />

        {lookupError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs">
            <span className="font-semibold text-red-700 dark:text-red-300">No pudimos cargar la lista de reses para registrar un tratamiento.</span>
            <button
              type="button"
              onClick={() => setLookupRetryKey((value) => value + 1)}
              className="min-h-[34px] rounded-lg border border-red-500/30 bg-background/70 px-3 font-bold text-red-700 hover:bg-red-500/10 dark:text-red-300"
            >
              Reintentar
            </button>
          </div>
        )}

        {topDiagnoses.length > 0 && !caseFilter && (
          <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 rounded-xl bg-card/40 border border-border/30 backdrop-blur-md">
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <Stethoscope className="h-3.5 w-3.5 text-purple-500" />
              Diagnósticos frecuentes
            </span>
            {(frequentDiagnosticsExpanded ? topDiagnoses : topDiagnoses.slice(0, 3)).map((d) => (
              <span
                key={d.name}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[11px] font-bold border border-purple-500/20"
                title={d.name}
              >
                <span className="max-w-[150px] fit-clamp">{d.name}</span>
                <span className="text-muted-foreground">×{d.count}</span>
              </span>
            ))}
            {topDiagnoses.length > 3 && (
              <button
                type="button"
                onClick={() => setFrequentDiagnosticsExpanded((v) => !v)}
                aria-expanded={frequentDiagnosticsExpanded}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/50 border border-border/30 transition-all"
                title={frequentDiagnosticsExpanded ? 'Ver menos diagnósticos' : 'Ver todos los diagnósticos'}
              >
                {frequentDiagnosticsExpanded ? '−' : `+${topDiagnoses.length - 3}`}
              </button>
            )}
          </div>
        )}
      </div>
    ),
    columns,
    formSections,
    searchPlaceholder: 'Buscar por diagnóstico, animal o notas...',
    emptyStateMessage: 'No hay tratamientos registrados.',
    emptyStateDescription: 'Crea el primer registro para comenzar.',
    defaultLimit: 100,
    pageSizeOptions: [15, 30, 50, 100, 250, 500, 1000],
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    showDetailTimestamps: false,
    showEditTimestamps: false,
    showIdInDetailTitle: false,
    themeColor: 'purple',
    customActions: (item) => {
      const episodeId = Number(item.animal_disease_id ?? (item as any).animal_disease?.id);
      if (!episodeId) return null;
      const info = stats.episodeById.get(episodeId);
      return (
        <button
          type="button"
          onClick={() => onOpenCase(episodeId)}
          className="h-8 sm:px-2.5 rounded-lg border border-purple-500/25 bg-purple-500/5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/40 transition-all duration-200"
          title={`Ver seguimiento del caso #${episodeId}${info ? ` · ${info.disease_label}` : ''}`}
        >
          <span className="flex items-center justify-center gap-1">
            <FileHeart className="h-3.5 w-3.5" />
              <span>Ver caso</span>
          </span>
        </button>
      );
    },
  };

  const filters = useMemo(() => (caseFilter ? { animal_disease_id: String(caseFilter) } : undefined), [caseFilter]);
  const initialFormData = useMemo(() => buildInitialFormData(user?.id), [user?.id]);

  if (loading) {
    return (
      <div className="space-y-4 p-1" aria-busy="true" aria-label="Cargando tratamientos">
        <div className="h-24 rounded-2xl border border-border/40 bg-muted/40 animate-pulse" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-20 rounded-xl border border-border/40 bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-28 rounded-xl border border-border/40 bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminCRUDPage
        config={crudConfig}
        service={treatmentsService}
        initialFormData={initialFormData}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        filterItems={filterItems}
        filters={filters}
        customDetailContent={(item) => (
          <TreatmentDetailModalContent
            treatment={item as any}
            animal={animalsMap.get(Number(item.animal_id || (item as any)?.animal?.id))}
            animalTreatments={stats.treatmentsByAnimal.get(Number(item.animal_id || (item as any)?.animal?.id)) || []}
            userLabel={userMap.get(Number((item as any).performed_by || (item as any).veterinarian))}
          />
        )}
        onItemsChange={(items) => {
          setCurrentItems(items as TreatmentRow[]);
        }}
        realtime={true}
        enhancedHover={true}
      />

      {/* Modal de insumos y botiquín asociado */}
      <TreatmentSuppliesModal isOpen={assocOpen} onClose={closeAssociations} treatment={selectedTreatment} />

      {/* Asistente guiado de tratamiento (wizard) */}
      <HealthInterventionWizard
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          setWizardOpen(false);
          handleTreatmentCreated();
        }}
      />
    </>
  );
};
