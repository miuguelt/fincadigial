import { BaseService } from '@/shared/api/base-service';

export interface InventoryAutonomy {
  product: string;
  unit: string;
  stock: number;
  daily_avg: number;
  days_left: number | null;
  /** 'depleted' es stock cero; 'critical' es que se acaba en menos de 7 días. */
  status: 'depleted' | 'critical' | 'warning' | 'stable';
}

export interface InventoryAutonomyResponse {
  items: InventoryAutonomy[];
  /** Productos distintos con stock, antes de recortar a los primeros N. */
  total_groups: number;
  /** Ventana de consumo con la que el backend promedia la salida diaria. */
  window_days: number;
}

class InventoryAnalyticsService extends BaseService<any> {
  constructor() {
    super('analytics/inventory', {
      enableCache: false,
    });
  }

  /**
   * Autonomía proyectada del inventario, ordenada de más urgente a menos.
   * `limit` recorta las filas mostradas pero conserva el total en total_groups.
   */
  async getAutonomy(limit?: number): Promise<InventoryAutonomyResponse> {
    const resp = await this.customRequest<any>('autonomy', 'GET');
    const body = resp?.data ?? resp ?? {};
    const items: InventoryAutonomy[] = body.items ?? (Array.isArray(body) ? body : []);
    return {
      items: limit ? items.slice(0, limit) : items,
      total_groups: body.total_groups ?? items.length,
      window_days: body.window_days ?? 30,
    };
  }
}

export const inventoryAnalyticsService = new InventoryAnalyticsService();
export default inventoryAnalyticsService;
