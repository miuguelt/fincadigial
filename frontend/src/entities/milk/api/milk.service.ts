import { BaseService } from '@/shared/api/base-service';

export interface MilkProduction {
  id: number;
  animal_id: number;
  finca_id: number;
  date: string;
  liters: number;
  milking_session: 'AM' | 'PM' | 'Extra';
  fat_percentage?: number;
  protein_percentage?: number;
  somatic_cells?: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MilkBatchEntry {
  animal_id: number;
  liters: number;
  milking_session: 'AM' | 'PM' | 'Extra';
  fat_percentage?: number;
  protein_percentage?: number;
  somatic_cells?: number;
  notes?: string;
}

export interface MilkBatchInput {
  date: string;
  entries: MilkBatchEntry[];
}

class MilkService extends BaseService<MilkProduction> {
  constructor() {
    super('milk-production', {
      enableCache: true,
    });
  }

  async getByAnimal(animalId: number, params: Record<string, any> = {}): Promise<any> {
    return this.customRequest(`animal/${animalId}`, 'GET', undefined, params);
  }

  async getDailySummary(fincaId: number, date?: string): Promise<any> {
    return this.customRequest('summary/daily', 'GET', undefined, { finca_id: fincaId, date });
  }

  async createBatch(input: MilkBatchInput): Promise<any> {
    return this.customRequest('batch', 'POST', input);
  }

  async getWeeklySummary(fincaId: number, startDate?: string): Promise<any> {
    return this.customRequest('summary/weekly', 'GET', undefined, { finca_id: fincaId, start_date: startDate });
  }

  async getMonthlySummary(fincaId: number, year?: number, month?: number): Promise<any> {
    return this.customRequest('summary/monthly', 'GET', undefined, { finca_id: fincaId, year, month });
  }

  async estimateRevenue(fincaId: number, pricePerLiter?: number, year?: number, month?: number): Promise<any> {
    return this.customRequest('revenue/estimate', 'GET', undefined, { 
      finca_id: fincaId, 
      price_per_liter: pricePerLiter,
      year,
      month 
    });
  }
}

export const milkService = new MilkService();
export default milkService;
