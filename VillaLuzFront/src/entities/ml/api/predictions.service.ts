import { BaseService } from '@/shared/api/base-service';

export interface GrowthAnomaly {
  id: number;
  animal_id: number;
  animal_name: string;
  type: 'weight_loss' | 'stagnation' | 'rapid_gain';
  severity: 'low' | 'medium' | 'high';
  message: string;
  diff_value: number;
  diff_formatted: string;
  detected_at: string;
}

class PredictionsService extends BaseService<any> {
  constructor() {
    super('analytics/predictions', {
      enableCache: true,
      cacheTimeout: 10 * 60 * 1000, // 10 minutos
    });
  }

  /**
   * Dispara y obtiene el monitoreo de anomalías de crecimiento
   */
  async getGrowthAnomalies(): Promise<GrowthAnomaly[]> {
    // El endpoint en el backend es POST /analytics/predictions/anomalies
    const res = await this.customRequest<any>('anomalies', 'POST');
    const anomaliesList = res?.anomalies || [];
    
    return anomaliesList.map((a: any, idx: number) => {
      let mappedType: GrowthAnomaly['type'] = 'stagnation';
      if (a.type === 'LACK_OF_DATA') mappedType = 'weight_loss';
      if (a.type === 'MARKET_READY') mappedType = 'rapid_gain';
      
      return {
        id: a.id || idx,
        animal_id: a.animal_id,
        animal_name: a.record || `Animal ${a.animal_id}`,
        type: mappedType,
        severity: a.severity || 'medium',
        message: a.message || '',
        diff_value: a.adg || 0,
        diff_formatted: a.adg ? `${a.adg} kg/d` : (a.type === 'MARKET_READY' ? 'Venta' : '-'),
        detected_at: new Date().toISOString()
      } as GrowthAnomaly;
    });
  }

  /**
   * Predice el peso futuro de un animal
   */
  async predictWeight(animalId: number, targetDate?: string): Promise<{
    animal_id: number;
    target_date: string;
    predicted_weight: number;
    confidence_interval: [number, number];
  }> {
    return this.customRequest(`weight/${animalId}`, 'GET', null, {
      params: targetDate ? { date: targetDate } : {}
    });
  }
}

export const predictionsService = new PredictionsService();
export default predictionsService;

