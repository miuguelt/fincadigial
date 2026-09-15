import { BaseService } from '@/shared/api/base-service';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';

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
  completion_record_id?: number | null;
  created_at?: string;
}

export interface TaskCompletionRecord {
  id: number;
  task_id: number;
  finca_id: number;
  completed_by?: number | null;
  completed_by_name?: string | null;
  completed_at: string;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
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
    if (status === 'Completada') {
      return this.complete(id);
    }
    return this.patch(id, { status });
  }

  async complete(id: number, notes?: string): Promise<TaskCompletionRecord> {
    const payload = {
      ...(notes ? { notes } : {}),
    };

    try {
      return await this.customRequest<TaskCompletionRecord>(`${id}/complete`, 'POST', payload);
    } catch (error: any) {
      const offline = typeof navigator !== 'undefined' && (
        !navigator.onLine || error?.code === 'ERR_NETWORK' || error?.status === 0
      );
      if (!offline) throw error;

      await offlineQueue.enqueue('POST', `${this.endpoint}/${id}/complete`, payload);
      return { task_id: id, _is_offline_pending: true } as unknown as TaskCompletionRecord;
    }
  }

  async getCompletion(id: number): Promise<TaskCompletionRecord> {
    return this.customRequest<TaskCompletionRecord>(`${id}/completion`, 'GET');
  }
}

export const taskService = new TaskService();
export default taskService;
