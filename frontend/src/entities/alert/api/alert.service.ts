import { BaseService } from '@/shared/api/base-service';

export interface AlertConfig {
  id?: number;
  animal_id?: number;
  alert_type: string;
  dimension: string;
  condition_value: string;
  message: string;
  priority: string;
  is_active: boolean;
  is_default: boolean;
  finca_id?: number;
}

export interface Alert {
  id?: number;
  animal_id?: number;
  field_id?: number;
  config_id?: number;
  alert_type: string;
  message: string;
  recommendation?: string;
  priority: string;
  is_read: boolean;
  triggered_at?: string;
}

class AlertService extends BaseService<Alert> {
  constructor() {
    super('alerts', {
      enableCache: true,
      preferredListKeys: ['alerts', 'data']
    });
  }

  /**
   * Obtener configuraciones de alertas (Reglas)
   */
  async getConfigs(params?: any): Promise<AlertConfig[]> {
    const response = await this.customRequest<AlertConfig[]>('configs', 'GET', undefined, { params });
    return (response as any)?.data || response || [];
  }

  /**
   * Crear o actualizar una configuración de alerta
   */
  async saveConfig(data: AlertConfig): Promise<AlertConfig> {
    const method = data.id ? 'PUT' : 'POST';
    const url = data.id ? `configs/${data.id}` : 'configs';
    return this.customRequest<AlertConfig>(url, method, data);
  }

  /**
   * Eliminar una configuración
   */
  async deleteConfig(id: number): Promise<boolean> {
    return this.customRequest<boolean>(`configs/${id}`, 'DELETE');
  }

  /**
   * Marcar alerta como resuelta (leída)
   */
  async resolve(id: number | string): Promise<boolean> {
    return this.customRequest<boolean>(`${id}/resolve`, 'POST');
  }
}

export const alertService = new AlertService();
export default alertService;

