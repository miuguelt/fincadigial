import { BaseService } from '@/shared/api/base-service';

export interface Prediction {
  date: string;
  session: 'AM' | 'PM';
  predicted_liters: number;
  confidence_lower: number;
  confidence_upper: number;
  confidence: 'high' | 'medium' | 'low';
}

export interface PredictionResponse {
  animal_id: number;
  model_metrics: {
    mae: number;
    r2: number;
    samples: number;
    degree: number;
  };
  trend_analysis: {
    model_type: string;
    degree: number;
    metrics: Record<string, number>;
    recommendation: string;
  };
  predictions: {
    am: Prediction[];
    pm: Prediction[];
  };
  total_predicted_7d: {
    am: number;
    pm: number;
    total: number;
  };
}

export interface Anomaly {
  date: string;
  liters: number;
  is_anomaly: boolean;
  z_score: number;
  severity: 'high' | 'medium' | 'low';
  expected_range: [number, number];
  explanation: string;
}

export interface OptimizationResponse {
  am_average: number;
  pm_average: number;
  best_session: 'AM' | 'PM' | 'N/A';
  best_day: string;
  worst_day: string;
  daily_averages: Record<string, number>;
  recommendations: string[];
}

export interface FarmPredictionResponse {
  finca_id: number;
  total_females: number;
  predictable_females: number;
  farm_predictions: {
    total_am_7d: number;
    total_pm_7d: number;
    total_7d: number;
    daily_average: number;
  };
  animal_predictions: Array<{
    animal_id: number;
    animal_name: string;
    predictions: {
      am: Prediction[];
      pm: Prediction[];
    };
    total_7d: {
      am: number;
      pm: number;
      total: number;
    };
  }>;
}

export interface FarmInsightsResponse {
  finca_id: number;
  ml_readiness: {
    total_females: number;
    ml_ready: number;
    percentage: number;
    total_production_records: number;
  };
  anomalies_summary: {
    total_detected: number;
    high_severity: number;
    recent_anomalies: Array<Anomaly & { animal_id: number; animal_name: string }>;
  };
  recommendations: string[];
}

class MLService extends BaseService<PredictionResponse> {
  constructor() {
    super('ml', {
      enableCache: true,
      preferredListKeys: ['items', 'results'],
    });
  }

  // Predicciones para un animal específico
  async getAnimalPredictions(animalId: number): Promise<PredictionResponse> {
    return this.customRequest<PredictionResponse>(`predictions/animal/${animalId}`, 'GET');
  }

  // Predicciones agregadas para la finca
  async getFarmPredictions(fincaId: number): Promise<FarmPredictionResponse> {
    return this.customRequest<FarmPredictionResponse>(`predictions/farm/${fincaId}`, 'GET');
  }

  // Detección de anomalías
  async getAnimalAnomalies(animalId: number): Promise<{
    animal_id: number;
    animal_name: string;
    anomalies_detected: number;
    anomalies: Anomaly[];
    recommendation: string;
  }> {
    return this.customRequest(`anomalies/animal/${animalId}`, 'GET');
  }

  // Optimización de producción
  async getAnimalOptimization(animalId: number): Promise<OptimizationResponse> {
    return this.customRequest<OptimizationResponse>(`optimization/animal/${animalId}`, 'GET');
  }

  // Insights de ML para la finca
  async getFarmInsights(fincaId: number): Promise<FarmInsightsResponse> {
    return this.customRequest<FarmInsightsResponse>(`insights/farm/${fincaId}`, 'GET');
  }

  // Comparar predicciones vs producción real
  async comparePredictionsVsActual(
    animalId: number,
    startDate: string,
    endDate: string
  ): Promise<{
    accuracy: number;
    mae: number;
    predictions: Array<{
      date: string;
      predicted: number;
      actual: number | null;
      error: number;
    }>;
  }> {
    return this.customRequest(
      `compare/animal/${animalId}`,
      'GET',
      undefined,
      { params: { start_date: startDate, end_date: endDate } }
    );
  }
}

export const mlService = new MLService();
export default mlService;
