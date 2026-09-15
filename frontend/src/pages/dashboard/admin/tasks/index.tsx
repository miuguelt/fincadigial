import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { taskService, Task } from '@/entities/task/api/task.service';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  IconCalendar,
  IconCheck,
  IconMapPin,
  IconPaw,
  IconPlus,
  IconLayoutGrid,
  IconTable,
  IconAlertTriangle,
} from '@/shared/ui/icons';
import { formatDateColombia, getTodayColombia } from '@/shared/utils/dateUtils';
import { animalService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';
import { useToast } from '@/app/providers/ToastContext';
import { cn } from '@/shared/ui/cn';

// Componentes modulares campesinos
import { TaskMetricsBento } from './components/TaskMetricsBento';
import { TaskQuickFilters } from './components/TaskQuickFilters';
import { TaskTemplatesModal } from './components/TaskTemplatesModal';
import { CampesinoTaskCard } from './components/CampesinoTaskCard';
import { TaskDetailContent } from './components/TaskDetailContent';
import { TaskCompletionBadge } from './components/TaskCompletionBadge';
import { TaskFilterKey, TaskMetrics, TaskTemplate } from './tasks.types';

const TasksPage: React.FC = () => {
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Estados principales de la vista campesina
  const [activeFilter, setActiveFilter] = useState<TaskFilterKey>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [templatesModalOpen, setTemplatesModalOpen] = useState(false);
  const [loadingStatusId, setLoadingStatusId] = useState<number | null>(null);

  // Diccionarios de referencia para nombres legibles
  const [fieldsMap, setFieldsMap] = useState<Record<number, string>>({});
  const [animalsMap, setAnimalsMap] = useState<Record<number, string>>({});
  const [usersMap, setUsersMap] = useState<Record<number, string>>({});

  // Métricas consolidadas de labores de la finca
  const [metrics, setMetrics] = useState<TaskMetrics>({
    todayCount: 0,
    urgentCount: 0,
    inProgressCount: 0,
    completedCount: 0,
    total: 0,
  });

  const [filterCounts, setFilterCounts] = useState({
    all: 0,
    today: 0,
    urgent_overdue: 0,
    in_progress: 0,
    my_tasks: 0,
    completed: 0,
  });

  // Datos iniciales de formulario
  const [formSeed, setFormSeed] = useState<Partial<Task>>({
    title: '',
    description: '',
    status: 'Pendiente',
    priority: 'Media',
    due_date: getTodayColombia(),
  });

  // Cargar diccionarios de la finca
  useEffect(() => {
    let isMounted = true;
    const loadLookups = async () => {
      try {
        const [fieldsData, animalsData, usersData] = await Promise.all([
          fieldService.getAll().catch(() => []),
          animalService.getAll().catch(() => []),
          fetchAssignableUsers(currentRole, { limit: 1000 }, user).catch(() => []),
        ]);

        if (!isMounted) return;

        const fMap: Record<number, string> = {};
        fieldsData.forEach((f: any) => {
          if (f?.id) fMap[f.id] = f.name || `Potrero #${f.id}`;
        });
        setFieldsMap(fMap);

        const aMap: Record<number, string> = {};
        animalsData.forEach((a: any) => {
          if (a?.id) {
            aMap[a.id] = (a.record || a.registro)
              ? `${a.record || a.registro} - ${a.name || a.nombre || ''}`
              : `Animal #${a.id}`;
          }
        });
        setAnimalsMap(aMap);

        const uMap: Record<number, string> = {};
        usersData.forEach((u: any) => {
          if (u?.id) uMap[u.id] = u.fullname || u.username || `Usuario #${u.id}`;
        });
        setUsersMap(uMap);
      } catch (err) {
        console.error('Error al cargar diccionarios para tareas:', err);
      }
    };

    loadLookups();
    return () => {
      isMounted = false;
    };
  }, [currentRole, user]);

  // Cargar y recalcular métricas de faena
  const refreshMetrics = useCallback(async () => {
    try {
      const allTasks = await taskService.getAll({ limit: 1000 }).catch(() => []);
      const today = getTodayColombia();

      let todayCount = 0;
      let urgentCount = 0;
      let inProgressCount = 0;
      let completedCount = 0;
      let myTasksCount = 0;

      allTasks.forEach((t) => {
        const taskDate = t.due_date ? t.due_date.split('T')[0] : null;
        const isCompleted = t.status === 'Completada';
        const isOverdue = taskDate ? taskDate < today && !isCompleted : false;
        const isUrgent = (t.priority === 'Urgente' || t.priority === 'Alta') && !isCompleted;

        if (taskDate === today && !isCompleted) todayCount++;
        if (isOverdue || isUrgent) urgentCount++;
        if (t.status === 'En Progreso') inProgressCount++;
        if (isCompleted) completedCount++;
        if (user?.id && t.assigned_to === user.id) myTasksCount++;
      });

      setMetrics({
        todayCount,
        urgentCount,
        inProgressCount,
        completedCount,
        total: allTasks.length,
      });

      setFilterCounts({
        all: allTasks.length,
        today: todayCount,
        urgent_overdue: urgentCount,
        in_progress: inProgressCount,
        my_tasks: myTasksCount,
        completed: completedCount,
      });
    } catch (err) {
      console.error('Error al calcular métricas de faena:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    refreshMetrics();
    const handleRefetch = () => {
      refreshMetrics();
    };
    window.addEventListener('crud:refetch', handleRefetch);
    return () => {
      window.removeEventListener('crud:refetch', handleRefetch);
    };
  }, [refreshMetrics]);

  // Manejo de cambio de estado de 1 toque desde la tarjeta o tabla
  const handle1TapStatusChange = useCallback(
    async (task: Task, newStatus: Task['status']) => {
      setLoadingStatusId(task.id);
      try {
        const result = await taskService.updateStatus(task.id, newStatus);
        window.dispatchEvent(new CustomEvent('crud:refetch'));
        showToast(
          newStatus === 'Completada'
            ? result?.id
              ? `¡Labor cumplida! Se guardó el registro #${result.id}.`
              : '¡Labor cumplida con éxito!'
            : `Labor marcada como "${newStatus}"`,
          'success'
        );
      } catch (err) {
        console.error('Error al actualizar estado de la labor:', err);
        showToast('No se pudo actualizar el estado de la labor', 'error');
      } finally {
        setLoadingStatusId(null);
      }
    },
    [showToast]
  );

  // Selección de plantilla ganadera rápida
  const handleSelectTemplate = useCallback(
    (template: TaskTemplate) => {
      setFormSeed({
        title: template.title,
        description: template.description,
        status: 'Pendiente',
        priority: template.priority,
        due_date: getTodayColombia(),
      });
      const sp = new URLSearchParams(searchParams);
      sp.set('create', '1');
      setSearchParams(sp);
      showToast(`Plantilla "${template.title}" aplicada`, 'info');
    },
    [searchParams, setSearchParams, showToast]
  );

  // Filtro en memoria según la pestaña campesina activa
  const filterItems = useCallback(
    (items: Task[]) => {
      const today = getTodayColombia();
      if (activeFilter === 'today') {
        return items.filter((t) => t.due_date && t.due_date.split('T')[0] === today);
      }
      if (activeFilter === 'urgent_overdue') {
        return items.filter((t) => {
          const taskDate = t.due_date ? t.due_date.split('T')[0] : null;
          const isOverdue = taskDate ? taskDate < today && t.status !== 'Completada' : false;
          const isUrgent = (t.priority === 'Urgente' || t.priority === 'Alta') && t.status !== 'Completada';
          return isOverdue || isUrgent;
        });
      }
      if (activeFilter === 'in_progress') {
        return items.filter((t) => t.status === 'En Progreso');
      }
      if (activeFilter === 'my_tasks') {
        return items.filter((t) => user?.id && t.assigned_to === user.id);
      }
      if (activeFilter === 'completed') {
        return items.filter((t) => t.status === 'Completada');
      }
      return items;
    },
    [activeFilter, user?.id]
  );

  const loadAssignees = useCallback(async () => {
    const people = await fetchAssignableUsers(currentRole, { limit: 1000 }, user);
    return people.map((p) => ({ label: `🤠 ${p.fullname}`, value: p.id }));
  }, [currentRole, user]);

  // Columnas para el modo tabla
  const columns: CRUDColumn<Task>[] = useMemo(
    () => [
      {
        key: 'title',
        label: 'Labor y Descripción',
        render: (val: string, item: Task) => (
          <div className="flex flex-col min-w-0 py-1">
            <span className="font-bold text-foreground fit-clamp">{val}</span>
            <span className="text-xs text-muted-foreground line-clamp-1">
              {item.description || 'Sin notas de faena'}
            </span>
          </div>
        ),
      },
      {
        key: 'status',
        label: 'Estado',
        render: (val: string) => {
          const variants: Record<string, 'secondary' | 'warning' | 'success' | 'destructive'> = {
            Pendiente: 'secondary',
            'En Progreso': 'warning',
            Completada: 'success',
            Cancelada: 'destructive',
          };
          return (
            <Badge variant={variants[val] || 'outline'} className="text-xs font-semibold">
              {val === 'En Progreso' ? 'En Faena' : val}
            </Badge>
          );
        },
      },
      {
        key: 'priority',
        label: 'Prioridad',
        render: (val: string) => {
          const variants: Record<string, 'outline' | 'secondary' | 'warning' | 'destructive'> = {
            Baja: 'outline',
            Media: 'secondary',
            Alta: 'warning',
            Urgente: 'destructive',
          };
          return (
            <Badge variant={variants[val] || 'outline'} className="text-xs font-bold uppercase">
              {val}
            </Badge>
          );
        },
      },
      {
        key: 'completion_record_id',
        label: 'Registro',
        render: (_val: number | null, item: Task) => <TaskCompletionBadge task={item} compact />,
      },
      {
        key: 'due_date',
        label: 'Fecha Vencimiento',
        render: (val: string, item: Task) => {
          if (!val) return <span className="text-xs text-muted-foreground">Sin fecha</span>;
          const today = getTodayColombia();
          const taskDate = val.split('T')[0];
          const isOverdue = taskDate < today && item.status !== 'Completada';
          const isToday = taskDate === today && item.status !== 'Completada';

          return (
            <div
              className={cn(
                'flex items-center gap-1.5 text-xs font-medium',
                isOverdue && 'text-rose-600 font-bold',
                isToday && 'text-emerald-700 font-bold'
              )}
            >
              {isOverdue ? <IconAlertTriangle size="sm" /> : <IconCalendar size="sm" />}
              <span>{formatDateColombia(val)}</span>
              {isToday && <Badge variant="success" className="text-[11px] py-0 px-1">Hoy</Badge>}
              {isOverdue && <Badge variant="destructive" className="text-[11px] py-0 px-1">Atrasada</Badge>}
            </div>
          );
        },
      },
      {
        key: 'field_id',
        label: 'Potrero',
        render: (val: number) => {
          const name = val ? fieldsMap[val] : null;
          return name ? (
            <div className="flex items-center gap-1 text-xs text-foreground font-medium">
              <IconMapPin size="sm" className="text-emerald-600 flex-shrink-0" />
              <span className="fit-clamp">{name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
      {
        key: 'animal_id',
        label: 'Animal',
        render: (val: number) => {
          const name = val ? animalsMap[val] : null;
          return name ? (
            <div className="flex items-center gap-1 text-xs text-foreground font-medium">
              <IconPaw size="sm" className="text-amber-600 flex-shrink-0" />
              <span className="fit-clamp">{name}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          );
        },
      },
    ],
    [fieldsMap, animalsMap]
  );

  // Secciones del modal flotante de creación y edición
  const formSections: CRUDFormSection<Partial<Task>>[] = useMemo(
    () => [
      {
        title: 'Detalles de la Faena o Labor',
        fields: [
          {
            name: 'title',
            label: 'Nombre de la labor ganadera',
            type: 'text',
            required: true,
            placeholder: 'Ej: Rotación de potrero, Purgar lote...',
            suggestions: [
              'Rotación de potrero al siguiente descanso',
              'Purgar y desparasitar lote de levante',
              'Revisar y tensionar cerca eléctrica',
              'Vacunación oficial (Aftosa / Carbunco)',
              'Curación de ombligos a terneros',
              'Lavar bebederos y saladeros',
              'Picar pasto de corte y forraje',
              'Suministrar sal mineralizada',
              'Pesaje de control de lote (Báscula)',
            ],
          },
          {
            name: 'description',
            label: 'Instrucciones u observaciones de campo',
            type: 'textarea',
            placeholder: 'Escribe detalles para el vaquero u operario...',
            suggestions: [
              'Realizar a primera hora de la mañana. Verificar que todos los animales queden con agua fresca.',
              'Revisar condición de cada animal al paso por la manga.',
              'Anotar cualquier novedad o síntoma en la libreta de campo.',
              'Utilizar equipo de protección y desinfectar implementos al terminar.',
            ],
          },
          {
            name: 'priority',
            label: 'Prioridad de atención',
            type: 'select',
            required: true,
            options: [
              { label: 'Urgente (Atención inmediata)', value: 'Urgente' },
              { label: 'Alta (Prioritaria)', value: 'Alta' },
              { label: 'Media (Rutina de la finca)', value: 'Media' },
              { label: 'Baja (Cuando haya espacio)', value: 'Baja' },
            ],
          },
          {
            name: 'status',
            label: 'Estado de la labor',
            type: 'select',
            required: true,
            options: [
              { label: 'Pendiente (Por arrancar)', value: 'Pendiente' },
              { label: 'En Progreso (En faena)', value: 'En Progreso' },
              { label: 'Completada (Labor cumplida)', value: 'Completada' },
              { label: 'Cancelada', value: 'Cancelada' },
            ],
          },
          {
            name: 'due_date',
            label: 'Fecha para realizar la faena',
            type: 'date',
            required: true,
          },
        ],
      },
      {
        title: 'Asignación y Ubicación en la Finca',
        fields: [
          {
            name: 'assigned_to',
            label: 'Vaquero / Encargado responsable',
            type: 'select',
            loadOptions: loadAssignees,
          } as any,
          {
            name: 'field_id',
            label: 'Potrero o Lote de pradera',
            type: 'select',
            loadOptions: async () => {
              const fields = await fieldService.getAll();
              return fields.map((f: any) => ({ label: `🌾 ${f.name}`, value: f.id }));
            },
          } as any,
          {
            name: 'animal_id',
            label: 'Animal individual (Opcional)',
            type: 'select',
            loadOptions: async () => {
              const animals = await animalService.getAll();
              return animals.map((a: any) => ({
                label: `🐂 ${(a.record || a.registro) ? `${a.record || a.registro} - ${a.name || a.nombre || ''}` : `Animal #${a.id}`}`,
                value: a.id,
              }));
            },
          } as any,
        ],
      },
    ],
    [loadAssignees]
  );

  // Encabezado personalizado con Bento de métricas
  const customHeader = useMemo(
    () => (
      <div className="space-y-3 mb-2">
        <TaskMetricsBento
          metrics={metrics}
          activeFilter={activeFilter}
          onSelectFilter={(filter) => setActiveFilter(filter)}
        />
      </div>
    ),
    [metrics, activeFilter]
  );

  // Barra de herramientas personalizada (Fila 2)
  const customToolbar = useMemo(
    () => (
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 w-full">
        {/* Lado izquierdo: Selector de vista + Filtros rápidos */}
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-x-auto no-scrollbar py-0.5">
          <div className="flex items-center border border-border/60 rounded-xl p-0.5 bg-card/60 shrink-0 shadow-2xs">
            <Button
              type="button"
              variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold h-7 flex items-center gap-1 transition-all',
                viewMode === 'cards' && 'bg-background shadow-xs text-foreground font-bold'
              )}
              title="Ver Cuaderno de Labores"
            >
              <IconLayoutGrid size="sm" />
              <span className="hidden sm:inline">Cuaderno</span>
            </Button>

            <Button
              type="button"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-semibold h-7 flex items-center gap-1 transition-all',
                viewMode === 'table' && 'bg-background shadow-xs text-foreground font-bold'
              )}
              title="Ver Tabla de Control"
            >
              <IconTable size="sm" />
              <span className="hidden sm:inline">Tabla</span>
            </Button>
          </div>

          <div className="h-5 w-px bg-border/60 mx-0.5 hidden sm:block shrink-0" />

          <div className="min-w-0 flex-1">
            <TaskQuickFilters
              activeFilter={activeFilter}
              onFilterChange={(filter) => setActiveFilter(filter)}
              counts={filterCounts}
            />
          </div>
        </div>

        {/* Lado derecho: Acción secundaria / Plantillas */}
        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTemplatesModalOpen(true)}
            className="rounded-xl h-8 px-3 text-xs font-bold border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/10 flex items-center gap-1.5 shadow-2xs"
          >
            <IconPlus size="sm" />
            <span>Plantillas de Faena</span>
          </Button>
        </div>
      </div>
    ),
    [viewMode, activeFilter, filterCounts, setViewMode]
  );

  // Configuración completa del CRUD
  const config: CRUDConfig<Task, Partial<Task>> = useMemo(
    () => ({
      entityName: 'Labor de Finca',
      title: 'Cuaderno de Labores y Faenas',
      headerDescription: 'Organiza labores, responsables, fechas y seguimiento diario',
      searchPlaceholder: 'Buscar labores, potreros, tareas...',
      columns,
      formSections,
      viewMode,
      cardGridClassName: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3',
      customHeader,
      customToolbar,
      toolbarPlacement: 'row',
      enableEditModal: true,
      enableDelete: true,
      enableDetailModal: true,
      renderCard: (item, openDetail) => (
        <CampesinoTaskCard
          task={item}
          onOpenDetail={openDetail}
          onStatusChange={handle1TapStatusChange}
          fieldsMap={fieldsMap}
          animalsMap={animalsMap}
          usersMap={usersMap}
          loadingStatusId={loadingStatusId}
        />
      ),
      customActions: (item: Task) => (
        <div className="flex items-center gap-1">
          {item.status !== 'Completada' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs font-bold text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 dark:text-emerald-400"
              onClick={(e) => {
                e.stopPropagation();
                handle1TapStatusChange(item, 'Completada');
              }}
              title="Marcar labor como cumplida"
            >
              <IconCheck size="sm" className="mr-1" />
              Cumplir
            </Button>
          )}
        </div>
      ),
    }),
    [
      columns,
      formSections,
      viewMode,
      customHeader,
      customToolbar,
      handle1TapStatusChange,
      fieldsMap,
      animalsMap,
      usersMap,
      loadingStatusId,
    ]
  );

  return (
    <>
      <AdminCRUDPage
        config={config}
        service={taskService}
        initialFormData={formSeed}
        filterItems={filterItems}
        customDetailContent={(item) => (
          <TaskDetailContent
            task={item}
            fieldsMap={fieldsMap}
            animalsMap={animalsMap}
            usersMap={usersMap}
            onStatusChanged={() => {
              refreshMetrics();
            }}
          />
        )}
        additionalFormContent={(_formData, editingItem) => {
          if (editingItem) return null;
          return (
            <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-emerald-950 dark:text-emerald-100">
                💡 ¿Quieres agilizar el registro con faenas típicas del campo?
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTemplatesModalOpen(true)}
                className="text-xs font-bold rounded-lg min-h-[36px] border-emerald-600/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20"
              >
                📋 Usar Plantilla
              </Button>
            </div>
          );
        }}
      />

      {/* Modal flotante de plantillas ganaderas */}
      <TaskTemplatesModal
        open={templatesModalOpen}
        onOpenChange={setTemplatesModalOpen}
        onSelectTemplate={handleSelectTemplate}
      />
    </>
  );
};

export default TasksPage;
