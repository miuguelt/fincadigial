import { useMemo, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Activity, CheckCircle2, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { animalDiseasesService } from '@/entities/animal-disease/api/animalDiseases.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { diseaseService } from '@/entities/disease/api/disease.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { ANIMAL_DISEASE_STATUSES } from '@/shared/constants/enums';
import type { AnimalDiseaseResponse, AnimalDiseaseInput } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/entities/animal/ui';
import { DiseaseLink } from '@/entities/disease/ui';
import { UserLink } from '@/entities/user/ui';
import { useForeignKeySelect } from '@/shared/hooks/useForeignKeySelect';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';

function AdminAnimalDiseasesPage() {
  const [searchParams] = useSearchParams();
  const preselectedUserId = searchParams.get('user_id');
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;

  const [activeFilterTab, setActiveFilterTab] = useState<'todos' | 'activos' | 'criticos' | 'recuperados'>('todos');
  const [stats, setStats] = useState({
    active: 0,
    recovered: 0,
    critical: 0,
    recoveryRate: 0,
    total: 0
  });

  // Filtros adicionales reactivos según la pestaña activa
  const additionalFilters = useMemo(() => {
    switch (activeFilterTab) {
      case 'activos':
        return { status: 'Activo,En tratamiento,En Tratamiento,Observación' };
      case 'criticos':
        return { status: 'Crónico' };
      case 'recuperados':
        return { status: 'Recuperado,Tratado' };
      default:
        return {};
    }
  }, [activeFilterTab]);

  // Cargar estadísticas sanitarias globales
  const fetchStats = useCallback(async () => {
    try {
      const res = await animalDiseasesService.getAnimalDiseases({ page: 1, limit: 1000 });
      const allItems = res.data || [];

      let active = 0;
      let recovered = 0;
      let critical = 0;

      allItems.forEach(item => {
        const status = item.status;
        if (status === 'Activo' || status === 'En tratamiento' || status === 'En Tratamiento' || status === 'Observación') {
          active++;
        } else if (status === 'Recuperado' || status === 'Tratado') {
          recovered++;
        } else if (status === 'Crónico') {
          critical++;
        }
      });

      const total = allItems.length;
      const recoveryRate = total > 0 ? Math.round((recovered / total) * 100) : 0;

      setStats({
        active,
        recovered,
        critical,
        recoveryRate,
        total
      });
    } catch (error) {
      console.error('Error fetching global animal disease stats:', error);
    }
  }, []);

  // Cargar estadísticas al montar
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Cabecera e indicadores optimizados para Móvil (Campesino) y Desktop
  const customHeader = useMemo(() => (
    <div className="space-y-3 sm:space-y-4">
      <SanidadTabs />

      {/* Banner de KPIs: 2x2 en móviles para máxima legibilidad sin ocupar toda la pantalla */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        {/* KPI 1: Enfermos */}
        <div className="backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex items-center justify-between bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-950/40 dark:to-red-900/10 border-red-500/20 hover:border-red-500/40 shadow-sm transition-all duration-300 group">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block truncate">Enfermos</span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{stats.active}</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium truncate">Enfermas / Cuidado</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-red-500/10 text-red-500 dark:bg-red-500/20 shrink-0 ml-1">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
          </div>
        </div>

        {/* KPI 2: Sanados */}
        <div className="backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex items-center justify-between bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-950/40 dark:to-emerald-900/10 border-emerald-500/20 hover:border-emerald-500/40 shadow-sm transition-all duration-300 group">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block truncate">Sanados</span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{stats.recovered}</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium truncate">Ya recuperadas</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 shrink-0 ml-1">
            <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>

        {/* KPI 3: Casos Graves */}
        <div className="backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex items-center justify-between bg-gradient-to-br from-amber-500/10 to-amber-600/5 dark:from-amber-950/40 dark:to-amber-900/10 border-amber-500/20 hover:border-amber-500/40 shadow-sm transition-all duration-300 group">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block truncate">Casos Graves</span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{stats.critical}</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium truncate">Crónicos / Alerta</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-amber-500/10 text-amber-500 dark:bg-amber-500/20 shrink-0 ml-1">
            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 animate-bounce" />
          </div>
        </div>

        {/* KPI 4: % Recuperación */}
        <div className="backdrop-blur-xl rounded-2xl border p-3 sm:p-4 flex items-center justify-between bg-gradient-to-br from-blue-500/10 to-blue-600/5 dark:from-blue-950/40 dark:to-blue-900/10 border-blue-500/20 hover:border-blue-500/40 shadow-sm transition-all duration-300 group">
          <div className="space-y-0.5 sm:space-y-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider block truncate">% Sanados</span>
            <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">{stats.recoveryRate}%</div>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground/80 font-medium truncate">Tasa de salvamento</p>
          </div>
          <div className="p-2 sm:p-3 rounded-xl bg-blue-500/10 text-blue-500 dark:bg-blue-500/20 shrink-0 ml-1">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros Segmentados Táctiles (Targets mínimos de 44px en Móvil) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-1.5 rounded-2xl bg-card/40 border border-border/30 backdrop-blur-md shadow-inner">
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5">
          {[
            { id: 'todos', label: 'Todos', longLabel: 'Todos los Registros', count: stats.total, dotColor: 'bg-emerald-600 dark:bg-emerald-400' },
            { id: 'activos', label: 'Enfermos', longLabel: 'Animales Enfermos', count: stats.active, dotColor: 'bg-red-500' },
            { id: 'criticos', label: 'Graves', longLabel: 'Casos Graves', count: stats.critical, dotColor: 'bg-amber-500' },
            { id: 'recuperados', label: 'Sanados', longLabel: 'Sanados / De Alta', count: stats.recovered, dotColor: 'bg-emerald-500' }
          ].map((tab) => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilterTab(tab.id as any)}
                aria-pressed={isActive}
                className={`flex items-center justify-between sm:justify-start gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-bold transition-all duration-200 min-h-[44px] sm:min-h-[36px] active:scale-95 ${
                  isActive
                    ? 'bg-card text-foreground shadow-md scale-[1.02] border border-border/60 bg-gradient-to-b from-white to-slate-50/90 dark:from-slate-800 dark:to-slate-900/90 font-black ring-1 ring-emerald-500/20'
                    : 'text-muted-foreground hover:bg-card/45 hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${tab.dotColor} ${isActive ? 'scale-125 shadow-sm' : 'opacity-70'}`} />
                  <span className="truncate sm:hidden">{tab.label}</span>
                  <span className="hidden sm:inline">{tab.longLabel}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-black transition-all ${
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-muted/40 text-muted-foreground/70'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-muted-foreground px-2 font-semibold">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          <span>Control de Sanidad en la Finca</span>
        </div>
      </div>
    </div>
  ), [stats, activeFilterTab]);

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

  // Crear mapas de búsqueda optimizados
  const animalMap = useMemo(() => {
    const map = new Map<number | string, string>();
    animalOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [animalOptions]);

  const diseaseMap = useMemo(() => {
    const map = new Map<number | string, string>();
    diseaseOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [diseaseOptions]);

  const instructorMap = useMemo(() => {
    const map = new Map<number | string, string>();
    instructorOptions.forEach(opt => map.set(opt.value, opt.label));
    return map;
  }, [instructorOptions]);

  // Columnas de la tabla con renderizado optimizado y Foreign Key Links
  const columns: CRUDColumn<AnimalDiseaseResponse & { [k: string]: any }>[] = useMemo(() => [
    { key: 'id', label: 'Código', render: (v) => v ?? '-' },

    {
      key: 'animal_id',
      label: 'Res',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = animalMap.get(id) || `Animal ${id}`;
        return <AnimalLink id={id} label={label} />;
      }
    },
    {
      key: 'disease_id',
      label: 'Enfermedad',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = diseaseMap.get(id) || `Enfermedad ${id}`;
        return <DiseaseLink id={id} label={label} />;
      }
    },
    {
      key: 'instructor_id',
      label: 'Encargado',
      render: (v) => {
        if (!v) return '-';
        const id = Number(v);
        const label = instructorMap.get(id) || `Encargado ${id}`;
        return <UserLink id={id} label={label} role="Instructor" />;
      }
    },
    { key: 'diagnosis_date', label: 'Fecha detección', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-') },
    {
      key: 'status',
      label: 'Estado',
      render: (v) => {
        if (!v) return '-';
        const valStr = String(v);

        let themeClass = "";
        let dotClass = "";
        let emoji = "";

        if (valStr === 'Activo' || valStr === 'Crónico') {
          themeClass = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/15";
          dotClass = "bg-rose-500 animate-pulse";
          emoji = valStr === 'Crónico' ? "⚠️" : "🚨";
        } else if (valStr === 'En tratamiento' || valStr === 'En Tratamiento') {
          themeClass = "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 hover:bg-sky-500/15";
          dotClass = "bg-sky-500";
          emoji = "💊";
        } else if (valStr === 'Observación') {
          themeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/15";
          dotClass = "bg-amber-500";
          emoji = "👁️";
        } else if (valStr === 'Recuperado' || valStr === 'Tratado') {
          themeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15";
          dotClass = "bg-emerald-500";
          emoji = "✅";
        } else {
          themeClass = "bg-muted/10 text-muted-foreground border-border/20 hover:bg-muted/15";
          dotClass = "bg-muted-foreground";
        }

        return (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold transition-all duration-300 border backdrop-blur-md hover:scale-[1.02] active:scale-[0.98] ${themeClass}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
            <span className="text-xs">{emoji}</span>
            <span>{valStr}</span>
          </span>
        );
      }
    },
    { key: 'notes' as any, label: 'Notas', render: (v) => v || '-' },
    { key: 'created_at' as any, label: 'Creado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-') },
    { key: 'updated_at' as any, label: 'Actualizado', render: (v) => (v ? new Date(v as string).toLocaleDateString('es-CO') : '-') },
  ], [animalMap, diseaseMap, instructorMap]);

  const formSections: CRUDFormSection<AnimalDiseaseInput & { [k: string]: any }>[] = [
    {
      title: 'Datos de la Enfermedad',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: '¿Cuál res está enferma?', type: 'select', required: true, options: animalOptions, placeholder: 'Seleccione la res', loading: animalLoading },
        { name: 'disease_id' as any, label: '¿Qué enfermedad tiene?', type: 'select', required: true, options: diseaseOptions, placeholder: 'Seleccione la enfermedad', loading: diseaseLoading },
        { name: 'instructor_id' as any, label: '¿Quién la está tratando?', type: 'select', required: true, options: instructorOptions, placeholder: 'Seleccione el encargado o veterinario', loading: instructorLoading },
        { name: 'diagnosis_date' as any, label: '¿Cuándo se dio cuenta?', type: 'date', required: true },
        { name: 'status' as any, label: '¿Cómo está de salud?', type: 'select', options: ANIMAL_DISEASE_STATUSES as any, placeholder: 'Seleccione el estado', colSpan: 2 },
        { name: 'notes' as any, label: 'Observaciones o Síntomas', type: 'textarea', placeholder: 'Escriba aquí si la res tiene fiebre, no come, o qué medicamentos se le están dando...', colSpan: 2 },
      ],
    },
  ];

  const crudConfig: CRUDConfig<AnimalDiseaseResponse & { [k: string]: any }, AnimalDiseaseInput & { [k: string]: any }> = {
    title: 'Registro de Sanidad y Enfermedades',
    entityName: 'Registro médico',
    columns,
    formSections,
    searchPlaceholder: 'Buscar qué res está enferma...',
    emptyStateMessage: 'No hay animales enfermos registrados aquí. ¡El ganado está sano!',
    emptyStateDescription: 'Si alguna res se enferma, anótela aquí para llevar el control.',
    enableDetailModal: true,
    enableCreateModal: true,
    enableEditModal: true,
    enableDelete: true,
    customHeader,
    additionalFilters,
    onAfterCreate: async () => {
      await fetchStats();
    },
    onAfterUpdate: async () => {
      await fetchStats();
    },
  };

  // Crear initialFormData con usuario preseleccionado si existe
  const dynamicInitialFormData = useMemo(() => ({
    ...initialFormData,
    instructor_id: preselectedUserId ? Number(preselectedUserId) : undefined as any,
  }), [preselectedUserId]);

  return (
    <AdminCRUDPage
      key={activeFilterTab}
      config={crudConfig}
      service={animalDiseasesService}
      onItemsChange={fetchStats}
      initialFormData={dynamicInitialFormData}
      mapResponseToForm={mapResponseToForm}
      validateForm={validateForm}
      additionalFormContent={(_formData, editingItem) => {
        if (!editingItem) return null;
        return (
          <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs sm:text-sm">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div><span className="font-semibold">Código:</span> {editingItem.id}</div>
              <div><span className="font-semibold">Creado:</span> {editingItem.created_at ? new Date(editingItem.created_at as any).toLocaleString("es-CO") : "-"}</div>
              <div><span className="font-semibold">Actualizado:</span> {editingItem.updated_at ? new Date(editingItem.updated_at as any).toLocaleString("es-CO") : "-"}</div>
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
}

export default AdminAnimalDiseasesPage;

// Mapear respuesta a formulario
const mapResponseToForm = (item: AnimalDiseaseResponse & { [k: string]: any }): AnimalDiseaseInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  disease_id: item.disease_id,
  instructor_id: item.instructor_id,
  diagnosis_date: item.diagnosis_date,
  status: item.status,
  notes: item.notes || '',
});

// Validación
const validateForm = (formData: AnimalDiseaseInput & { [k: string]: any }): string | null => {
  // Validar animal_id: debe ser un número válido > 0
  const animalId = Number(formData.animal_id);
  if (!formData.animal_id || Number.isNaN(animalId) || animalId <= 0) {
    return '⚠️ Debe seleccionar qué res está enferma.';
  }

  // Validar disease_id: debe ser un número válido > 0
  const diseaseId = Number(formData.disease_id);
  if (!formData.disease_id || Number.isNaN(diseaseId) || diseaseId <= 0) {
    return '⚠️ Debe seleccionar la enfermedad que tiene la res.';
  }

  // Validar instructor_id: debe ser un número válido > 0
  const instructorId = Number(formData.instructor_id);
  if (!formData.instructor_id || Number.isNaN(instructorId) || instructorId <= 0) {
    return '⚠️ Debe decirnos quién está a cargo de tratar la res.';
  }

  if (!formData.diagnosis_date) return '⚠️ La fecha en que se dio cuenta de la enfermedad es obligatoria.';
  return null;
};

// Datos iniciales
const initialFormData: AnimalDiseaseInput & { [k: string]: any } = {
  animal_id: undefined as any, // Forzar que el usuario seleccione
  disease_id: undefined as any, // Forzar que el usuario seleccione
  instructor_id: undefined as any, // Forzar que el usuario seleccione
  diagnosis_date: getTodayColombia(),
  status: ANIMAL_DISEASE_STATUSES[0]?.value ?? 'Activo',
  notes: '',
};
