import { BaseService } from '@/shared/api/base-service';

export interface UpcomingEvent {
  animal_id: number;
  record: string;
  expected_date: string;
  days_remaining: number;
  status: 'overdue' | 'imminent' | 'upcoming';
  type: 'birth' | 'vaccination' | 'control';
  title: string;
}

export interface UpcomingEventsResponse {
  births: any[];
  vaccinations: any[];
  controls: any[];
  summary: {
    total: number;
    critical: number;
  }
}

class MedicalService extends BaseService<any> {
  constructor() {
    super('analytics/animals', {
      enableCache: false,
    });
  }

  /**
   * Obtiene eventos ganaderos próximos (partos, vacunas, controles)
   */
  async getUpcomingEvents(days: number = 30): Promise<UpcomingEventsResponse> {
    const resp = await this.customRequest<any>('upcoming-events', 'GET', undefined, {
      params: { days }
    });

    const data = resp.data || resp;

    // Normalizar la respuesta del backend a un formato más amigable para la UI del campesino
    return {
      births: (data.births || []).map((b: any) => ({
        ...b,
        type: 'birth',
        title: 'Parto programado',
        expected_date: b.expected_birth,
        days_remaining: b.days_to_birth
      })),
      vaccinations: (data.vaccinations || []).map((v: any) => ({
        ...v,
        type: 'vaccination',
        title: 'Vacuna pendiente',
        expected_date: v.due_date,
        days_remaining: v.days_remaining
      })),
      controls: (data.controls || []).map((c: any) => ({
        ...c,
        type: 'control',
        title: 'Control de salud',
        expected_date: c.due_date,
        days_remaining: c.days_remaining
      })),
      summary: {
        total: (data.births?.length || 0) + (data.vaccinations?.length || 0) + (data.controls?.length || 0),
        critical: (data.births?.filter((b:any) => b.days_to_birth <= 7).length || 0) +
                  (data.vaccinations?.filter((v:any) => v.days_remaining <= 3).length || 0)
      }
    };
  }
}

export const medicalService = new MedicalService();
export default medicalService;
