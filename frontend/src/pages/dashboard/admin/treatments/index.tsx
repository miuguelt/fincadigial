import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { CRUDColumn, CRUDFormSection, CRUDConfig } from '@/shared/types/crud';
import { treatmentsService } from '@/entities/treatment/api/treatments.service';
import { animalsService } from '@/entities/animal/api/animal.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { TreatmentSuppliesModal } from '@/widgets/dashboard/treatments/TreatmentSuppliesModal';
import { TreatmentDetailModalContent } from '@/widgets/dashboard/treatments/TreatmentDetailModalContent';
import { HealthInterventionWizard } from '@/widgets/dashboard/treatments/HealthInterventionWizard';
import type { TreatmentResponse, TreatmentInput } from '@/shared/api/generated/swaggerTypes';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { AnimalLink } from '@/entities/animal/ui';
import { UserLink } from '@/entities/user/ui';
import { useToast } from '@/app/providers/ToastContext';
import { SanidadTabs } from '@/widgets/dashboard/treatments/SanidadTabs';
import { PremiumTreatmentsHeader } from '@/widgets/dashboard/treatments/PremiumTreatmentsHeader';
import { Activity, AlertTriangle, Calendar, Filter, Sparkles } from 'lucide-react';
import { cn } from '@/shared/ui/cn';

/**
 * Tiempo relativo en español (ej: "hace 2 días", "hoy")
 */
function timeAgo(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `en ${Math.abs(diffDays)} d`;
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `hace ${diffDays} d`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `hace ${weeks} sem`;
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `hace ${months} m`;
  }
  const years = Math.floor(diffDays / 365);
  return `hace ${years} a`;
}

const AdminTreatmentsPage: React.FC = () => {
  const { showToast } = useToast();
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;

  const [animalOptions, setAnimalOptions] = useState<{ value: number; label: string }[]>([]);
  const [animalsMap, setAnimalsMap] = useState<Map<number, any>>(new Map());
  const [userOptions, setUserOptions] = useState<{ value: number; label: string }[]>([]);
  const [userMap, setUserMap] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);

  // States for supplies modal
  const [assocOpen, setAssocOpen] = useState(false);
  const [selectedTreatment, setSelectedTreatment] = useState<TreatmentResponse | null>(null);
  const [currentItems, setCurrentItems] = useState<Array<TreatmentResponse & { [k: string]: any }>>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Quick Filter Tabs State
  const [activeFilterTab, setActiveFilterTab] = useState<'todos' | 'retiro' | 'recientes' | 'con_costo'>('todos');
  const [wizardOpen, setWizardOpen] = useState(false);

  // Load Animals
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res: any = await animalsService.getAnimals?.();
        const items = Array.isArray(res) ? res : res?.data || res?.items || [];
        const aMap = new Map<number, any>();
        const aOpts = (items || []).map((a: any) => {
          aMap.set(a.id, a);
          return {
            value: a.id,
            label: a.record || a.tag || `ID ${a.id}`,
          };
        });
        setAnimalsMap(aMap);
        setAnimalOptions(aOpts);
      } catch (e) {
        showToast('Error al cargar animales', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  // Load assignable users non-blocking
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await fetchAssignableUsers(currentRole, { limit: 200 }, user).catch(() => []);
        if (!isMounted) return;
        const uMap = new Map<number, string>();
        const uOpts = (res || []).map((u: any) => {
          uMap.set(u.id, u.fullname || u.name || `Usuario #${u.id}`);
          return {
            value: u.id,
            label: u.fullname || u.name || `Usuario #${u.id}`,
          };
        });
        setUserMap(uMap);
        setUserOptions(uOpts);
      } catch {
        // Non-critical background fetch
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

  // Group treatments by animal_id for quick statistical lookups in the detail view
  const treatmentsByAnimalMap = useMemo(() => {
    const map = new Map<number, Array<TreatmentResponse & { [k: string]: any }>>();
    currentItems.forEach((item) => {
      const aId = Number(item.animal_id || (item as any)?.animal?.id);
      if (aId) {
        const existing = map.get(aId) || [];
        existing.push(item);
        map.set(aId, existing);
      }
    });
    return map;
  }, [currentItems]);

  const openAssociations = useCallback((item: TreatmentResponse) => {
    setSelectedTreatment(item);
    setAssocOpen(true);
  }, []);

  const closeAssociations = useCallback(() => {
    setAssocOpen(false);
    setSelectedTreatment(null);
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleTreatmentCreated = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  // Enhanced Columns for Treatments Table
  const columns: CRUDColumn<TreatmentResponse & { [k: string]: any }>[] = useMemo(
    () => [
      {
        key: 'action' as any,
        label: '',
        sortable: false,
        render: (_v, item) => (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-primary hover:text-primary hover:bg-primary/10"
            onClick={(e) => {
              e.stopPropagation();
              openAssociations(item);
            }}
            title="Ver Insumos"
          >
            <span className="flex items-center gap-1">💉 Ver Insumos</span>
          </Button>
        ),
      },
      {
        key: 'animal_id' as any,
        label: 'Animal',
        sortable: true,
        render: (value: any) => {
          if (!value) return '-';
          const id = Number(value);
          const animal = animalsMap.get(id);
          const label = animal?.record || animal?.tag || animalMap.get(id) || `Animal ${id}`;
          const subinfo = [animal?.breed_name || animal?.breed, animal?.sex || animal?.gender].filter(Boolean).join(' · ');

          return (
            <div className="flex flex-col min-w-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 w-fit">
                <span>🐄</span> <AnimalLink id={id} label={label} />
              </span>
              {subinfo && (
                <span className="text-[11px] text-muted-foreground mt-0.5 fit-clamp max-w-[140px]">
                  {subinfo}
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'treatment_date' as any,
        label: 'Fecha',
        sortable: true,
        render: (v) => {
          if (!v) return '-';
          const dateStr = String(v);
          const d = new Date(dateStr);
          const formatted = isNaN(d.getTime())
            ? dateStr
            : d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
          return (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground text-xs">{formatted}</span>
              <span className="text-[11px] text-muted-foreground">{timeAgo(dateStr)}</span>
            </div>
          );
        },
      },
      {
        key: 'diagnosis' as any,
        label: 'Diagnóstico',
        sortable: true,
        render: (_v, item) => {
          const diag = (item as any).diagnosis || (item as any).description || '-';
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className="p-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs shrink-0">🩺</span>
              <span className="font-bold text-foreground text-xs sm:text-sm fit-clamp max-w-[220px]" title={diag}>
                {diag}
              </span>
            </div>
          );
        },
      },
      {
        key: 'dosis' as any,
        label: 'Posología',
        render: (_v, item) => {
          const dose = (item as any).dosis ?? (item as any).dose ?? '';
          const freq = (item as any).frequency ?? (item as any).frecuencia ?? '';
          if (!dose && !freq) return <span className="text-muted-foreground text-xs">-</span>;
          return (
            <div className="flex flex-col text-xs min-w-0">
              {dose && <span className="font-semibold text-foreground fit-clamp max-w-[130px]">{dose}</span>}
              {freq && <span className="text-[11px] text-muted-foreground fit-clamp max-w-[130px]">{freq}</span>}
            </div>
          );
        },
      },
      {
        key: 'withdrawal_days' as any,
        label: 'Período de Retiro',
        sortable: true,
        render: (_v, item) => {
          const days = Number((item as any).withdrawal_days) || 0;
          const endDateStr = (item as any).withdrawal_end_date;
          if (days <= 0 && !endDateStr) {
            return <span className="text-[11px] text-muted-foreground font-medium">Sin retiro</span>;
          }

          let endDate: Date;
          if (endDateStr) {
            endDate = new Date(String(endDateStr));
          } else if (item.treatment_date) {
            endDate = new Date(String(item.treatment_date));
            endDate.setDate(endDate.getDate() + days);
          } else {
            return <span className="text-[11px] text-muted-foreground font-medium">Sin retiro</span>;
          }

          const today = new Date();
          today.setHours(0, 0, 0, 0);
          endDate.setHours(0, 0, 0, 0);
          const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const isActive = diff >= 0;

          if (isActive) {
            return (
              <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[11px] font-bold px-2 py-0.5 flex items-center gap-1 w-fit animate-pulse">
                <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>{diff}d restantes</span>
              </Badge>
            );
          }

          return (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold px-2 py-0.5 flex items-center gap-1 w-fit">
              <span>✅</span>
              <span>Cumplido</span>
            </Badge>
          );
        },
      },
      {
        key: 'cost' as any,
        label: 'Costo (COP)',
        sortable: true,
        render: (v) => {
          if (v === undefined || v === null || v === '' || Number(v) <= 0) {
            return <span className="text-muted-foreground text-xs">-</span>;
          }
          return (
            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
              {new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0,
              }).format(Number(v))}
            </span>
          );
        },
      },
      {
        key: 'performed_by' as any,
        label: 'Responsable',
        render: (v, item) => {
          const id = Number(v || (item as any).veterinarian);
          if (!id) return <span className="text-muted-foreground text-xs">-</span>;
          const name = userMap.get(id) || `Usuario #${id}`;
          return <UserLink id={id} label={name} />;
        },
      },
      {
        key: 'created_at' as any,
        label: 'Creado',
        render: (v) => (v ? new Date(String(v)).toLocaleString('es-CO') : '-'),
      },
    ],
    [animalMap, animalsMap, userMap, openAssociations]
  );

  // Form Sections for Create & Edit Modals (Audited for Colombian Livestock context & backend constraints)
  const formSections: CRUDFormSection<TreatmentInput & { [k: string]: any }>[] = [
    {
      title: 'Información Principal del Tratamiento',
      gridCols: 2,
      fields: [
        {
          name: 'animal_id' as any,
          label: 'Animal',
          type: 'searchable-select',
          required: true,
          options: animalOptions,
          placeholder: 'Buscar o seleccionar animal...',
          helperText: 'Bovino al que se le aplicará el tratamiento clínico',
          colSpan: 2,
        },
        {
          name: 'treatment_date' as any,
          label: 'Fecha de Tratamiento',
          type: 'date',
          required: true,
          helperText: 'Fecha en que se suministra el tratamiento',
        },
        {
          name: 'performed_by' as any,
          label: 'Responsable / Veterinario',
          type: 'searchable-select',
          options: userOptions,
          placeholder: 'Seleccionar veterinario o responsable...',
          helperText: 'Profesional o encargado de la aplicación',
        },
        {
          name: 'diagnosis' as any,
          label: 'Diagnóstico / Motivo Clínico',
          type: 'text',
          required: true,
          placeholder: 'Ej: Mastitis clínica, Fiebre de leche, Desparasitación...',
          helperText: 'Cuadro clínico, patología o razón del tratamiento',
          colSpan: 2,
        },
      ],
    },
    {
      title: 'Posología, Retiro y Costos',
      gridCols: 2,
      fields: [
        {
          name: 'dosis' as any,
          label: 'Dosis Suministrada',
          type: 'text',
          required: true,
          placeholder: 'Ej: 10 ml, 20 cc, 1 ampolla, 2 tabletas...',
          helperText: 'Cantidad exacta administrada',
        },
        {
          name: 'frequency' as any,
          label: 'Frecuencia de Aplicación',
          type: 'text',
          required: true,
          placeholder: 'Ej: Dosis única, Cada 12 horas, Cada 24 horas por 3 días...',
          helperText: 'Intervalo de tiempo entre dosis',
        },
        {
          name: 'withdrawal_days' as any,
          label: 'Días de Retiro Sanitario (Carne/Leche)',
          type: 'number',
          placeholder: 'Ej: 0',
          helperText: 'Días de espera según norma ICA sin comercialización',
        },
        {
          name: 'cost' as any,
          label: 'Costo Directo (COP)',
          type: 'number',
          placeholder: 'Ej: 45000',
          helperText: 'Valor del tratamiento en pesos colombianos',
        },
      ],
    },
    {
      title: 'Protocolo y Observaciones Clínicas',
      gridCols: 1,
      fields: [
        {
          name: 'description' as any,
          label: 'Protocolo / Descripción Clínica',
          type: 'textarea',
          placeholder: 'Detalles del procedimiento aplicado, medicamentos usados y pautas médicas...',
        },
        {
          name: 'observations' as any,
          label: 'Observaciones y Evolución',
          type: 'textarea',
          placeholder: 'Notas de seguimiento, reacciones observadas o advertencias de manejo...',
        },
      ],
    },
  ];

  // Dynamic filter counts
  const filterCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let activeRetiro = 0;
    let recent30d = 0;
    let withCost = 0;

    currentItems.forEach((item) => {
      // Retiro
      const days = Number(item.withdrawal_days) || 0;
      const endDateStr = item.withdrawal_end_date;
      if (days > 0 || endDateStr) {
        let endDate: Date;
        if (endDateStr) {
          endDate = new Date(String(endDateStr));
        } else if (item.treatment_date) {
          endDate = new Date(String(item.treatment_date));
          endDate.setDate(endDate.getDate() + days);
        } else {
          endDate = new Date(0);
        }
        endDate.setHours(0, 0, 0, 0);
        if (endDate >= today) activeRetiro++;
      }

      // Recientes
      if (item.treatment_date) {
        const d = new Date(String(item.treatment_date));
        if (d >= thirtyDaysAgo) recent30d++;
      }

      // Con inversión
      if (item.cost !== undefined && item.cost !== null && Number(item.cost) > 0) {
        withCost++;
      }
    });

    return {
      todos: currentItems.length,
      retiro: activeRetiro,
      recientes: recent30d,
      con_costo: withCost,
    };
  }, [currentItems]);

  // Quick Filter Tabs Component
  const QuickFilterTabs = (
    <div className="flex items-center gap-1.5 p-1 bg-muted/40 backdrop-blur-md rounded-xl border border-border/40 w-full overflow-x-auto no-scrollbar">
      <Button
        variant={activeFilterTab === 'todos' ? 'primary' : 'ghost'}
        size="sm"
        className="h-8 text-xs font-semibold px-3 rounded-lg shrink-0 gap-1.5"
        onClick={() => setActiveFilterTab('todos')}
      >
        <Activity className="w-3.5 h-3.5" />
        <span>Todos</span>
        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-background/40">
          {filterCounts.todos}
        </span>
      </Button>

      <Button
        variant={activeFilterTab === 'retiro' ? 'primary' : 'ghost'}
        size="sm"
        className={cn(
          'h-8 text-xs font-semibold px-3 rounded-lg shrink-0 gap-1.5',
          activeFilterTab === 'retiro' && 'bg-amber-600 text-white hover:bg-amber-700'
        )}
        onClick={() => setActiveFilterTab('retiro')}
      >
        <AlertTriangle className={cn("w-3.5 h-3.5", activeFilterTab === 'retiro' ? 'text-white' : 'text-amber-500')} />
        <span>En Retiro Activo</span>
        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-background/40">
          {filterCounts.retiro}
        </span>
      </Button>

      <Button
        variant={activeFilterTab === 'recientes' ? 'primary' : 'ghost'}
        size="sm"
        className="h-8 text-xs font-semibold px-3 rounded-lg shrink-0 gap-1.5"
        onClick={() => setActiveFilterTab('recientes')}
      >
        <Calendar className="w-3.5 h-3.5" />
        <span>Últimos 30 días</span>
        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-background/40">
          {filterCounts.recientes}
        </span>
      </Button>

      <Button
        variant={activeFilterTab === 'con_costo' ? 'primary' : 'ghost'}
        size="sm"
        className="h-8 text-xs font-semibold px-3 rounded-lg shrink-0 gap-1.5"
        onClick={() => setActiveFilterTab('con_costo')}
      >
        <Filter className="w-3.5 h-3.5" />
        <span>Con Inversión</span>
        <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-full bg-background/40">
          {filterCounts.con_costo}
        </span>
      </Button>
    </div>
  );

  const crudConfig: CRUDConfig<TreatmentResponse & { [k: string]: any }, TreatmentInput & { [k: string]: any }> = {
    title: 'Tratamientos',
    entityName: 'Tratamiento',
    customToolbar: (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setWizardOpen(true)}
        className="h-10 px-3 sm:px-3.5 rounded-xl border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 font-bold text-xs gap-1.5 shadow-sm"
        title="Abrir Asistente Clínico de Tratamiento Guiado"
      >
        <Sparkles className="h-4 w-4 text-purple-500" />
        <span className="hidden sm:inline">Asistente Clínico</span>
      </Button>
    ),
    customHeader: (
      <div className="space-y-2.5 sm:space-y-3.5">
        <SanidadTabs />
        <PremiumTreatmentsHeader items={currentItems} />
        {QuickFilterTabs}
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
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center animate-pulse">
          <p className="text-muted-foreground text-sm">Cargando tratamientos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <AdminCRUDPage
        key={refreshTrigger}
        config={crudConfig}
        service={treatmentsService}
        initialFormData={buildInitialFormData()}
        mapResponseToForm={mapResponseToForm}
        validateForm={validateForm}
        customDetailContent={(item) => (
          <TreatmentDetailModalContent
            treatment={item as any}
            animal={animalsMap.get(Number(item.animal_id || (item as any)?.animal?.id))}
            animalTreatments={treatmentsByAnimalMap.get(Number(item.animal_id || (item as any)?.animal?.id)) || []}
            userLabel={userMap.get(Number((item as any).performed_by || (item as any).veterinarian))}
          />
        )}
        onItemsChange={setCurrentItems}
        realtime={true}
        enhancedHover={true}
      />

      {/* Modal de Insumos y Botiquín Asociado */}
      <TreatmentSuppliesModal
        isOpen={assocOpen}
        onClose={closeAssociations}
        treatment={selectedTreatment}
      />

      {/* Asistente Guiado de Tratamiento (Wizard) */}
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

// Handlers for AdminCRUDPage
const mapResponseToForm = (item: TreatmentResponse & { [k: string]: any }): TreatmentInput & { [k: string]: any } => ({
  animal_id: item.animal_id ?? (item as any)?.animal?.id ?? (item as any)?.animals?.id,
  treatment_date: (item as any).treatment_date || (item as any).date || getTodayColombia(),
  diagnosis: (item as any).diagnosis ?? (item as any).description ?? '',
  description: (item as any).description ?? (item as any).diagnosis ?? '',
  dosis: (item as any).dosis ?? (item as any).dose ?? '',
  frequency: (item as any).frequency ?? (item as any).frecuencia ?? '',
  withdrawal_days: item.withdrawal_days !== undefined && item.withdrawal_days !== null ? Number(item.withdrawal_days) : 0,
  cost: item.cost !== undefined && item.cost !== null ? Number(item.cost) : undefined,
  performed_by: item.performed_by ?? (item as any).veterinarian ?? (item as any).performer?.id ?? undefined,
  observations: (item as any).observations ?? (item as any).notes ?? '',
});

const validateForm = (formData: TreatmentInput & { [k: string]: any }): string | null => {
  if (!formData.animal_id || Number(formData.animal_id) <= 0) {
    return 'Debe seleccionar un animal para el tratamiento.';
  }
  if (!formData.treatment_date) {
    return 'La fecha del tratamiento es obligatoria.';
  }
  if (!formData.diagnosis?.trim() && !formData.description?.trim()) {
    return 'El diagnóstico o motivo del tratamiento es obligatorio.';
  }
  if (!formData.dosis?.trim()) {
    return 'La dosis es obligatoria (ej: 10 ml, 1 ampolla, etc.).';
  }
  if (!formData.frequency?.trim()) {
    return 'La frecuencia es obligatoria (ej: Dosis única, Cada 12 horas, etc.).';
  }
  if (formData.withdrawal_days !== undefined && formData.withdrawal_days !== null && Number(formData.withdrawal_days) < 0) {
    return 'Los días de retiro no pueden ser un valor negativo.';
  }
  if (formData.cost !== undefined && formData.cost !== null && Number(formData.cost) < 0) {
    return 'El costo del tratamiento no puede ser negativo.';
  }
  return null;
};

const buildInitialFormData = (): TreatmentInput & { [k: string]: any } => ({
  animal_id: undefined as any,
  treatment_date: getTodayColombia(),
  diagnosis: '',
  description: '',
  dosis: '',
  frequency: 'Dosis única',
  withdrawal_days: 0,
  cost: undefined,
  performed_by: undefined,
  observations: '',
});

export default AdminTreatmentsPage;
