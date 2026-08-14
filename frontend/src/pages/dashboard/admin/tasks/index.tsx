import React from 'react';
import { AdminCRUDPage } from '@/widgets/admin-crud';
import { taskService, Task } from '@/entities/task/api/task.service';
import { CRUDConfig, CRUDColumn, CRUDFormSection } from '@/shared/types/crud';
import { Badge } from '@/shared/ui/badge';
import { IconCalendar } from '@/shared/ui/icons';
import { formatDateColombia } from '@/shared/utils/dateUtils';
import { animalService } from '@/entities/animal/api/animal.service';
import { fieldService } from '@/entities/field/api/field.service';
import { fetchAssignableUsers } from '@/entities/user/api/assignableUsers.service';
import { useAuth } from '@/features/auth/model/useAuth';

const TasksPage: React.FC = () => {
  const { user, role } = useAuth() as any;
  const currentRole = role || user?.role || null;

  const loadAssignees = React.useCallback(async () => {
    const people = await fetchAssignableUsers(currentRole, { limit: 1000 }, user);
    return people.map((p) => ({ label: p.fullname, value: p.id }));
  }, [currentRole, user]);

  const initialFormData: Partial<Task> = {
    title: '',
    description: '',
    status: 'Pendiente',
    priority: 'Media',
    due_date: new Date().toISOString().split('T')[0],
  };

  const columns: CRUDColumn<Task>[] = [
    {
      key: 'title',
      label: 'Tarea',
      render: (val: string, item: Task) => (
        <div className="flex flex-col">
          <span className="font-bold text-foreground">{val}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{item.description || 'Sin descripción'}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Estado',
      render: (val: string) => {
        const variants: Record<string, string> = {
          'Pendiente': 'secondary',
          'En Progreso': 'warning',
          'Completada': 'success',
          'Cancelada': 'destructive'
        };
        return <Badge variant={variants[val] as any || 'outline'}>{val}</Badge>;
      }
    },
    {
      key: 'priority',
      label: 'Prioridad',
      render: (val: string) => {
        const variants: Record<string, string> = {
          'Baja': 'outline',
          'Media': 'secondary',
          'Alta': 'warning',
          'Urgente': 'destructive'
        };
        return <Badge variant={variants[val] as any || 'outline'}>{val}</Badge>;
      }
    },
    {
      key: 'due_date',
      label: 'Vencimiento',
      render: (val: string) => (
        <div className="flex items-center gap-1 text-xs">
          <IconCalendar size="sm" />
          {val ? formatDateColombia(val) : 'Sin fecha'}
        </div>
      )
    }
  ];

  const formSections: CRUDFormSection<Partial<Task>>[] = [
    {
      title: 'Detalles de la Tarea',
      fields: [
        {
          name: 'title',
          label: 'Título',
          type: 'text',
          required: true,
          placeholder: 'Ej: Vacunación lote A',
        },
        {
          name: 'description',
          label: 'Descripción',
          type: 'textarea',
          placeholder: 'Detalles adicionales...',
        },
        {
          name: 'status',
          label: 'Estado',
          type: 'select',
          required: true,
          options: [
            { label: 'Pendiente', value: 'Pendiente' },
            { label: 'En Progreso', value: 'En Progreso' },
            { label: 'Completada', value: 'Completada' },
            { label: 'Cancelada', value: 'Cancelada' },
          ],
        },
        {
          name: 'priority',
          label: 'Prioridad',
          type: 'select',
          required: true,
          options: [
            { label: 'Baja', value: 'Baja' },
            { label: 'Media', value: 'Media' },
            { label: 'Alta', value: 'Alta' },
            { label: 'Urgente', value: 'Urgente' },
          ],
        },
        {
          name: 'due_date',
          label: 'Fecha de Vencimiento',
          type: 'date',
        },
      ]
    },
    {
      title: 'Asignación y Relaciones',
      fields: [
        {
          name: 'assigned_to',
          label: 'Asignar a',
          type: 'select',
          loadOptions: loadAssignees,
        } as any,
        {
          name: 'animal_id',
          label: 'Animal Relacionado',
          type: 'select',
          loadOptions: async () => {
            const animals = await animalService.getAll();
            return animals.map((a: any) => ({ 
              label: (a.record || a.registro) ? `${a.record || a.registro} - ${a.name || a.nombre || ''}` : `Animal #${a.id}`, 
              value: a.id 
            }));
          }
        } as any,
        {
          name: 'field_id',
          label: 'Campo/Potrero',
          type: 'select',
          loadOptions: async () => {
            const fields = await fieldService.getAll();
            return fields.map((f: any) => ({ label: f.name, value: f.id }));
          }
        } as any,
      ]
    }
  ];

  const config: CRUDConfig<Task, Partial<Task>> = {
    entityName: 'Tarea',
    title: 'Tareas de la finca',
    searchPlaceholder: 'Buscar tareas...',
    columns,
    formSections,
    enableEditModal: true,
    enableDelete: true,
    enableDetailModal: true,
  };

  return (
    <AdminCRUDPage
      config={config}
      service={taskService}
      initialFormData={initialFormData}
    />
  );
};

export default TasksPage;

