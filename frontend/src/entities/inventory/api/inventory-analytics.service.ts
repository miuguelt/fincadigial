import { BaseService } from '@/shared/api/base-service';

export interface InventoryAutonomy {
  product: string;
  unit: string;
  stock: number;
  daily_avg: number;
  days_left: number | null;
  status: 'critical' | 'warning' | 'stable';
}

class InventoryAnalyticsService extends BaseService<any> {
  constructor() {
    super('analytics/inventory', {
      enableCache: false,
    });
  }

  /**
   * Obtiene la autonomía proyectada del inventario
   */
  async getAutonomy(): Promise<InventoryAutonomy[]> {
    const resp = await this.customRequest<any>('autonomy', 'GET');
    return resp.data || resp || [];
  }
}

export const inventoryAnalyticsService = new InventoryAnalyticsService();
export default inventoryAnalyticsService;
