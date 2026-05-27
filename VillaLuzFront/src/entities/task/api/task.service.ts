import { BaseService } from '@/shared/api/base-service';

export interface Task {
  id: number;
  title: string;
  description?: string;
  status: 'Pendiente' | 'En Progreso' | 'Completada' | 'Cancelada';
  priority: 'Baja' | 'Media' | 'Alta' | 'Urgente';
  due_date?: string;
  animal_id?: number;
  field_id?: number;
  assigned_to?: number;
  finca_id: number;
  created_at?: string;
}

class TaskService extends BaseService<Task> {
  constructor() {
    super('tasks', {
      enableCache: true,
    });
  }

  async getMyTasks(params: Record<string, any> = {}): Promise<any> {
    return this.customRequest('me', 'GET', undefined, params);
  }

  async updateStatus(id: number, status: Task['status']): Promise<any> {
    return this.customRequest(`${id}/status`, 'PATCH', { status });
  }
}

export const taskService = new TaskService();
export default taskService;

