import { BaseService } from '@/shared/api/base-service';
import { ReproductiveEventResponse, PaginatedResponse, OffspringResponse, OffspringInput } from '@/shared/api/generated/swaggerTypes';

export interface ReproductionSummary {
  total_females: number;
  total_events: number;
  total_inseminations: number;
  total_births: number;
  active_pregnancies: number;
  births_next_30_days: number;
  overdue_births: number;
  conception_rate_pct: number | null;
  total_alive_offspring: number;
  total_dead_offspring: number;
}

export interface AnimalReproductionHistory {
  animal_id: number;
  animal_record: string;
  events: ReproductiveEventResponse[];
  metrics: {
    total_inseminations: number;
    positive_diagnoses: number;
    total_births: number;
    total_alive_offspring: number;
    total_dead_offspring: number;
    conception_rate_pct: number | null;
  };
  active_pregnancy: {
    insemination_date: string;
    expected_birth_date: string;
    days_remaining: number;
    technique: string | null;
  } | null;
}

class ReproductionService extends BaseService<ReproductiveEventResponse> {
  constructor() {
    super('reproduction/events', {
      enableCache: true,
      preferredListKeys: ['items', 'results'],
    });
  }

  // Eventos
  async getEvents(params?: Record<string, any>): Promise<ReproductiveEventResponse[]> {
    return this.getAll(params);
  }

  async getEventsPaginated(params?: Record<string, any>): Promise<PaginatedResponse<ReproductiveEventResponse>> {
    return this.getPaginated(params);
  }

  async getAnimalHistory(animalId: number): Promise<AnimalReproductionHistory> {
    return this.customRequest<AnimalReproductionHistory>(`animal/${animalId}`, 'GET');
  }

  // Crías
  async getOffspring(params?: Record<string, any>): Promise<PaginatedResponse<OffspringResponse>> {
    return this.customRequest<PaginatedResponse<OffspringResponse>>('../offspring', 'GET', undefined, { params });
  }

  async createOffspring(data: OffspringInput): Promise<OffspringResponse> {
    return this.customRequest<OffspringResponse>('../offspring', 'POST', data);
  }

  // Resumen y Alertas
  async getSummary(): Promise<ReproductionSummary> {
    return this.customRequest<ReproductionSummary>('../summary', 'GET');
  }

  async getPendingBirths(days: number = 60): Promise<ReproductiveEventResponse[]> {
    return this.customRequest<ReproductiveEventResponse[]>('../pending-births', 'GET', undefined, {
      params: { days }
    });
  }

  async getFertilityDashboard(months: number = 12): Promise<any> {
    return this.customRequest<any>('../fertility-dashboard', 'GET', undefined, {
      params: { months },
      timeout: 120000,
      skipTimeoutRetry: true
    });
  }

  async getHeatAlerts(): Promise<any[]> {
    return this.customRequest<any[]>('../heat-alerts', 'GET');
  }

  async getCalendar(startDate?: string, endDate?: string): Promise<any[]> {
    return this.customRequest<any[]>('calendar', 'GET', undefined, {
      params: { start_date: startDate, end_date: endDate }
    });
  }

  async getSirePerformance(months: number = 12): Promise<any> {
    return this.customRequest<any>('../sire-performance', 'GET', undefined, {
      params: { months },
      timeout: 120000,
      skipTimeoutRetry: true
    });
  }

  async getGenealogy(animalId: number, depth: number = 3, direction: string = 'both'): Promise<any> {
    return this.customRequest<any>(`genealogy/${animalId}`, 'GET', undefined, {
      params: { depth, direction },
      timeout: 60000,
      skipTimeoutRetry: true
    });
  }
}

export const reproductionService = new ReproductionService();
export default reproductionService;
