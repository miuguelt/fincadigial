import { BaseService } from '@/shared/api/base-service';

export interface GrowthPoint {
  date: string;
  weight: number;
  height: number | null;
  health_status: string | null;
  age_months: number | null;
  expected_weight: number | null;
  deviation_pct: number | null;
}

export interface GrowthStats {
  first_weight: number | null;
  last_weight: number | null;
  total_gain_kg: number | null;
  avg_daily_gain_kg: number | null;
  trend: 'positivo' | 'estancado' | 'negativo' | 'sin_datos';
  slope_kg_per_day: number | null;
  current_deviation_pct: number | null;
  growth_score: number;
}

export interface AnimalGrowth {
  animal_id: number;
  animal_record: string;
  sex: string | null;
  birth_date: string | null;
  age_months: number | null;
  current_weight: number | null;
  controls_count: number;
  data_points: GrowthPoint[];
  reference_curve: Array<{ months: number; expected_weight: number; date: string }>;
  stats: GrowthStats;
}

export interface GrowthSummaryItem {
  animal_id: number;
  animal_record: string;
  sex: string | null;
  age_months: number | null;
  current_weight: number | null;
  controls_count: number;
  stats: GrowthStats | null;
  note?: string;
}

export interface GrowthAlerts {
  negative_trend: any[];
  stagnant: any[];
  below_reference: any[];
  summary: {
    negative_count: number;
    stagnant_count: number;
    below_ref_count: number;
  };
}

class GrowthService extends BaseService<any> {
  constructor() {
    super('growth', {
      enableCache: true,
      cacheTimeout: 10 * 60 * 1000, // 10 min
    });
  }

  async getAnimalGrowth(animalId: number): Promise<AnimalGrowth> {
    return this.customRequest<AnimalGrowth>(`animal/${animalId}`, 'GET');
  }

  async getSummary(params?: { status?: string; sex?: string; min_controls?: number; limit?: number }): Promise<GrowthSummaryItem[]> {
    return this.customRequest<GrowthSummaryItem[]>('summary', 'GET', undefined, { params });
  }

  async getAlerts(): Promise<GrowthAlerts> {
    return this.customRequest<GrowthAlerts>('alerts', 'GET');
  }
}

export const growthService = new GrowthService();
export default growthService;
