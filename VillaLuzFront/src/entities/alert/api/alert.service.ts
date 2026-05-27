import { BaseService } from '@/shared/api/base-service';
import { apiClient } from '@/shared/api/client';

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

export interface AlertStats {
  total: number;
  unread: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  by_type: Record<string, number>;
}

export interface EvaluateResult {
  triggered: number;
  total: number;
  errors?: string[];
}

class AlertService extends BaseService<Alert> {
  constructor() {
    super('alerts', {
      enableCache: true,
      preferredListKeys: ['alerts', 'data']
    });
  }

  async getAlerts(params?: {
    is_read?: boolean;
    priority?: string;
    alert_type?: string;
    limit?: number;
    page?: number;
  }): Promise<Alert[]> {
    const response = await this.customRequest<Alert[]>('', 'GET', undefined, { params });
    return (response as any)?.data || response || [];
  }

  async getAlertStats(): Promise<AlertStats> {
    const response = await apiClient.get('/analytics/alerts/');
    const data = (response as any)?.data || response;
    return {
      total: data?.total || 0,
      unread: data?.unread || 0,
      critical: data?.critical || 0,
      high: data?.high || 0,
      medium: data?.medium || 0,
      low: data?.low || 0,
      by_type: data?.by_type || {},
    };
  }

  async markAsRead(id: number): Promise<boolean> {
    return this.customRequest<boolean>(`${id}/read`, 'POST');
  }

  async markAllAsRead(): Promise<boolean> {
    return this.customRequest<boolean>('/read-all', 'POST');
  }

  async evaluateAlerts(): Promise<EvaluateResult> {
    const result = await this.customRequest<EvaluateResult>('/evaluate', 'POST');
    return { triggered: (result as any)?.triggered || 0, total: (result as any)?.total || 0 };
  }

  async getConfigs(params?: { limit?: number; page?: number; is_active?: boolean }): Promise<AlertConfig[]> {
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

