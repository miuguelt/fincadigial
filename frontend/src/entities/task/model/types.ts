export type TaskStatus = 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';
export type TaskPriority = 'Baja' | 'Media' | 'Alta' | 'Urgente';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  animal_id?: number;
  field_id?: number;
  assigned_to?: number;
  finca_id: number;
  created_at?: string;
  updated_at?: string;
}

export interface TaskFormData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  animal_id?: number;
  field_id?: number;
  assigned_to?: number;
  finca_id: number;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  finca_id?: number;
  assigned_to?: number;
  page?: number;
  limit?: number;
}
