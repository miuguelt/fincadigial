import { BaseService } from '@/shared/api/base-service';

export interface MilkProduction {
  id: number;
  animal_id: number;
  finca_id: number;
  date: string;
  liters: number;
  session: 'AM' | 'PM' | 'Extra';
  fat_percentage?: number;
  protein_percentage?: number;
  somatic_cells?: number;
  notes?: string;
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
}

export const milkService = new MilkService();
export default milkService;
