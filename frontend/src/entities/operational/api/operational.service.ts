import { BaseService } from '@/shared/api/base-service';

export interface OperationalCost {
  id: number;
  concept: string;
  amount: number;
  date: string;
  category: string;
  finca_id: number;
  notes?: string;
  created_at?: string;
}

class OperationalService extends BaseService<OperationalCost> {
  constructor() {
    super('operational', {
      enableCache: true,
    });
  }

  async getSummary(params: Record<string, any> = {}): Promise<any> {
    return this.customRequest('summary', 'GET', undefined, params);
  }
}

export const operationalService = new OperationalService();
export default operationalService;
