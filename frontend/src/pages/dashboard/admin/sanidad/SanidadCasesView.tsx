import React, { useMemo, useState, useCallback } from 'react';
import { CalendarDays, ChevronDown, ClipboardList, Sparkles, Target } from 'lucide-react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDConfig } from '@/shared/types/crud';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';
import { DiseaseFollowupContent } from '@/widgets/dashboard/disease-followup/DiseaseFollowupContent';
import { DiseaseAnalytics } from '../animalDiseases/DiseaseAnalytics';
import { cn } from '@/shared/ui/cn';
import { SanidadModuleHeader, SanidadView } from './SanidadModuleHeader';
import { buildCasesColumns } from './SanidadCasesColumns';
import { buildCasesFormSections, initialFormData, mapResponseToForm, validateForm, CaseRow } from './sanidadCasesConfig';
import type { SanidadStatsData } from './useSanidadStats';

const STATUS_TABS = [
  { id: 'todos', label: 'Todos', longLabel: 'Todos los registros', dotColor: 'bg-emerald-600 dark:bg-emerald-400' },
  { id: 'activos', label: 'Enfermos', longLabel: 'Animales enfermos', dotColor: 'bg-red-500' },
  { id: 'criticos', label: 'Graves', longLabel: 'Casos graves', dotColor: 'bg-amber-500' },
  { id: 'recuperados', label: 'Sanados', longLabel: 'Sanados / de alta', dotColor: 'bg-emerald-500' },
] as const;

interface SanidadCasesViewProps {
  stats: SanidadStatsData;
  refreshStats: () => void;
  onShowTreatmentsForCase: (caseId: number) => void;
  focusCaseId: number | null;
  onViewChange: (view: SanidadView) => void;
}

/**
 * Vista «Casos clínicos» del Módulo Sanidad: episodios de enfermedad con su
 * seguimiento completo (avances, tratamientos, vacunas, recomendaciones,
 * controles) y acceso directo a los registros vinculados de cada caso.
 */
export const SanidadCasesView: React.FC<SanidadCasesViewProps> = ({
  stats,
  refreshStats,
  onShowTreatmentsForCase,
  focusCaseId,
  onViewChange,
}) => {
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;

  const [activeFilterTab, setActiveFilterTab] = useState<'todos' | 'activos' | 'criticos' | 'recuperados'>('todos');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const filters = useMemo(() => {
    const f: Record<string, string> = {};
    switch (activeFilterTab) {
      case 'activos':
        f.status = 'Activo,En tratamiento,En Tratamiento,Observación';
        break;
      case 'criticos':
        // Graves: se mide por gravedad clínica (Severa / Crítica); hereda el
        // estado legacy 'Crónico' para fincas con datos históricos.
        f.severity = 'Severa,Crítica';
        break;
      case 'recuperados':
        f.status = 'Recuperado,Tratado,Curado,Resuelto';
        break;
      default:
        break;
    }
    if (dateFrom) f.diagnosis_date_from = dateFrom;
    if (dateTo) f.diagnosis_date_to = dateTo;
    return f;
  }, [activeFilterTab, dateFrom, dateTo]);

  const { options: animalOptions, loading: animalLoading } = useForeignKeySelect(
    (p) => animalsService.getAnimals(p),
    (a) => ({ value: a.id, label: a.record || `ID ${a.id}` })
  );

  const { options: diseaseOptions, loading: diseaseLoading } = useForeignKeySelect(
    (p) => diseaseService.getDiseases(p),
    (d) => ({ value: d.id, label: d.disease || d.name || `Enfermedad ${d.id}` })
  );

  const { options: instructorOptions, loading: instructorLoading } = useForeignKeySelect(
    (p) => fetchAssignableUsers(currentRole, p, user),
    (u) => ({ value: u.id, label: u.fullname })
  );

  const animalMap = useMemo(() => {
    const map = new Map<number | string, string>();
    animalOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const diseaseMap = useMemo(() => {
    const map = new Map<number | string, string>();
    diseaseOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [diseaseOptions]);

  const instructorMap = useMemo(() => {
    const map = new Map<number | string, string>();
    instructorOptions.forEach((opt) => map.set(opt.value, opt.label));
    return map;
  }, [instructorOptions]);

  const columns = useMemo(
    () => buildCasesColumns({ animalMap, diseaseMap, instructorMap, focusCaseId }),
    [animalMap, diseaseMap, instructorMap, focusCaseId]
  );

  const formSections = useMemo(
    () =>
      buildCasesFormSections({
        animalOptions,
        animalLoading,
        diseaseOptions,
        diseaseLoading,
        instructorOptions,
        instructorLoading,
      }),
    [animalOptions, animalLoading, diseaseOptions, diseaseLoading, instructorOptions, instructorLoading]
  );

  const handleRefreshStats = useCallback(() => {
    refreshStats();
  }, [refreshStats]);

  const crudConfig: CRUDConfig<CaseRow, any> = {
    title: 'Casos clínicos',
    entityName: 'Caso clínico',
    mobileTitleColumn: 'animal_id',
    mobileHighlightColumn: 'disease_id',
    mobileColumns: ['diagnosis_date', 'status', 'severity', 'instructor_id'],
    columns,
    formSections,
    searchPlaceholder: 'Buscar por res, enfermedad o estado...',
    emptyStateMessage: 'No hay animales enfermos registrados. ¡El ganado está sano!',
    emptyStateDescription: 'Si alguna res se enferma, anótela aquí para llevar el control.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    themeColor: 'emerald',
    customActions: (item) => {
      const info = stats.treatmentsByEpisode.get(Number(item.id));
      if (!info || info.count === 0) return null;
      return (
        <button
          type="button"
          onClick={() => onShowTreatmentsForCase(Number(item.id))}
          className="h-8 sm:px-2.5 rounded-lg border border-purple-500/25 bg-purple-500/5 text-[11px] font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-500/15 hover:border-purple-500/40 transition-all duration-200"
          title={`Ver los ${info.count} registros vinculados a este caso`}
        >
          <span className="flex items-center justify-center gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Ver tratamientos {info.count}</span>
          </span>
        </button>
      );
    },
    toolbarPlacement: 'row',
    customToolbar: (
      <div className="flex w-full items-center gap-1.5 p-1 bg-muted/60 backdrop-blur-md rounded-xl border border-border/40 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => {
          const isActive = activeFilterTab === tab.id;
          const count =
            tab.id === 'todos'
              ? stats.episodes.total
              : tab.id === 'activos'
                ? stats.episodes.active
                : tab.id === 'criticos'
                  ? stats.episodes.critical
                  : stats.episodes.recovered;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id as any)}
              aria-pressed={isActive}
              className={cn(
                'flex h-7 sm:h-8 items-center gap-1.5 rounded-lg px-2.5 sm:px-3 text-xs font-semibold shrink-0 transition-all cursor-pointer',
                isActive
                  ? 'bg-background text-foreground shadow-sm ring-1 ring-border/60'
                  : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'
              )}
            >
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', tab.dotColor, isActive && 'scale-125')} />
              <span className="sm:hidden">{tab.label}</span>
              <span className="hidden sm:inline">{tab.longLabel}</span>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[11px] font-black', isActive ? 'bg-muted/60' : 'bg-background/50 text-muted-foreground')}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    ),
    customHeader: (
      <div className="space-y-3">
        <SanidadModuleHeader view="casos" stats={stats} onViewChange={onViewChange} />

        {focusCaseId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <Target className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 fit-clamp">
              Caso #{focusCaseId} abierto desde Tratamientos — haz clic en la fila para ver su seguimiento
            </span>
          </div>
        )}

        {/* Rango de fechas de detección + análisis desplegable */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-2 rounded-xl bg-card/40 border border-border/30 backdrop-blur-md">
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            Fecha de detección
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="Desde"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-[11px] font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            />
            <span className="text-[11px] text-muted-foreground">hasta</span>
            <input
              type="date"
              aria-label="Hasta"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-input bg-background text-[11px] font-medium focus:ring-2 focus:ring-primary/20 outline-none"
            />
            {(dateFrom || dateTo) && (
              <button
                type="button"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
                className="h-8 px-3 rounded-lg border border-border/50 hover:bg-muted/50 text-[11px] font-bold transition-all"
              >
                Limpiar fechas
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowAnalytics((s) => !s)}
            className="sm:ml-auto h-8 px-3 rounded-lg border border-border/50 hover:bg-muted/50 text-[11px] font-bold transition-all flex items-center gap-1.5"
            aria-expanded={showAnalytics}
          >
            <Sparkles className="h-3.5 w-3.5 text-purple-500" />
            Análisis de casos
            <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', showAnalytics && 'rotate-180')} />
          </button>
        </div>

        {showAnalytics && <DiseaseAnalytics stats={stats.episodes.episodeAnalytics} loading={stats.loading} />}
      </div>
    ),
    onAfterCreate: async () => handleRefreshStats(),
    onAfterUpdate: async () => handleRefreshStats(),
  };

  return (
    <AdminCRUDPage
      config={crudConfig}
      service={animalDiseasesService}
      initialFormData={initialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      filters={filters}
      initialDetailId={focusCaseId}
      customDetailContent={(item) => (
        <DiseaseFollowupContent episodeId={item.id} onEpisodeChange={handleRefreshStats} />
      )}
      additionalFormContent={(_formData, editingItem) => {
        if (!editingItem) return null;
        return (
          <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs sm:text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div>
                <span className="font-semibold">Código:</span> {editingItem.id}
              </div>
              <div>
                <span className="font-semibold">Creado:</span>{' '}
                {editingItem.created_at ? new Date(editingItem.created_at as any).toLocaleString('es-CO') : '-'}
              </div>
              <div>
                <span className="font-semibold">Actualizado:</span>{' '}
                {editingItem.updated_at ? new Date(editingItem.updated_at as any).toLocaleString('es-CO') : '-'}
              </div>
            </div>
          </div>
        );
      }}
      realtime={true}
      pollIntervalMs={0}
      refetchOnFocus={false}
      refetchOnReconnect={true}
      enhancedHover={true}
    />
  );
};
