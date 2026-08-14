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
  /** Críticas pendientes de leer — lo accionable, no el histórico. */
  criticalUnread: number;
  high: number;
  medium: number;
  low: number;
  by_type: Record<string, number>;
}

export interface AlertPage {
  items: Alert[];
  /** Total matching rows on the server, not the page length. */
  total: number;
}

export interface EvaluateResult {
  triggered?: number;
  total?: number;
  task_id?: string;
  status?: 'queued' | 'running' | 'completed';
  errors?: string[];
}

/** Normalizes both the analytics envelope and the legacy flat stats shape. */
export function normalizeAlertStats(payload: any, fallbackTotal = 0): AlertStats {
  const envelope = payload?.data && typeof payload.data === 'object' && !Array.isArray(payload.data)
    ? payload.data
    : payload;
  const source = envelope?.statistics ?? envelope?.stats ?? envelope ?? {};
  const byPriority = source.by_priority ?? source.byPriority ?? {};
  const alerts = Array.isArray(envelope?.alerts) ? envelope.alerts : [];

  return {
    total: Number(source.total ?? (alerts.length || fallbackTotal)),
    unread: Number(source.unread ?? alerts.filter((alert: any) => !alert.is_read).length ?? 0),
    critical: Number(source.critical ?? byPriority.critica ?? byPriority.crítica ?? 0),
    criticalUnread: Number(
      source.critical_unread ?? source.criticalUnread ??
      alerts.filter((alert: any) => !alert.is_read && String(alert.priority).toLowerCase() === 'crítica').length
    ),
    high: Number(source.high ?? byPriority.alta ?? 0),
    medium: Number(source.medium ?? byPriority.media ?? 0),
    low: Number(source.low ?? byPriority.baja ?? 0),
    by_type: source.by_type ?? source.byType ?? {},
  };
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

  /**
   * Igual que getAlerts, pero conserva el total real de la paginación del backend
   * (customRequest descarta `meta`, por eso se llama a apiClient directamente).
   */
  async getAlertsPage(params?: {
    is_read?: boolean;
    priority?: string;
    alert_type?: string;
    limit?: number;
    page?: number;
  }): Promise<AlertPage> {
    const response = await apiClient.get('/alerts/', { params });
    const body = (response as any)?.data ?? response;
    const raw = body?.data ?? body?.alerts ?? body;
    const items: Alert[] = Array.isArray(raw) ? raw : [];
    const totalItems = body?.meta?.pagination?.total_items;
    return {
      items,
      total: Number.isFinite(Number(totalItems)) ? Number(totalItems) : items.length,
    };
  }

  async getAlertStats(): Promise<AlertStats> {
    const response = await apiClient.get('/analytics/alerts/');
    const data = (response as any)?.data || response;
    return normalizeAlertStats(data);
  }

  async markAsRead(id: number): Promise<boolean> {
    return this.customRequest<boolean>(`${id}/read`, 'POST');
  }

  async markAllAsRead(): Promise<boolean> {
    return this.customRequest<boolean>('/read-all', 'POST');
  }

  async evaluateAlerts(): Promise<EvaluateResult> {
    const result = await this.customRequest<EvaluateResult>('/evaluate', 'POST');
    return result;
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

