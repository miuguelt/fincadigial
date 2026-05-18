import { BaseService } from '@/shared/api/base-service';

export interface ActivityLog {
  id: number;
  action: string;
  entity: string;
  entity_id?: number;
  title?: string;
  description?: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  actor_id?: number;
  animal_id?: number;
  relations?: any;
  finca_id?: number;
  created_at: string;
  actor?: {
    id: number;
    fullname: string;
    email: string;
  };
}

class ActivityLogService extends BaseService<ActivityLog> {
  constructor() {
    super('activity', {
      enableCache: true,
    });
  }

  async getRecent(limit: number = 10): Promise<ActivityLog[]> {
    const resp = await this.getPaginated({ limit, sort_by: 'created_at', sort_order: 'desc' });
    return (resp as any)?.data || (resp as any)?.items || [];
  }
}

export const activityLogService = new ActivityLogService();
export default activityLogService;

