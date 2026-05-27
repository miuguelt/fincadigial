import { BaseService } from '@/shared/api/base-service';
import { InventoryLotResponse, PaginatedResponse, InventoryMovementResponse, InventoryMovementInput } from '@/shared/api/generated/swaggerTypes';

export interface InventorySummary {
  total_lots: number;
  medication_lots: number;
  vaccine_lots: number;
  expired_lots: number;
  expiring_soon_lots: number;
  low_stock_lots: number;
  total_estimated_value: number;
  recent_movements: InventoryMovementResponse[];
}

export interface InventoryAlerts {
  expired: InventoryLotResponse[];
  expiring_soon: InventoryLotResponse[];
  low_stock: InventoryLotResponse[];
  summary: {
    expired_count: number;
    expiring_soon_count: number;
    low_stock_count: number;
  };
}

class InventoryService extends BaseService<InventoryLotResponse> {
  constructor() {
    super('inventory/lots', {
      enableCache: true,
      preferredListKeys: ['items', 'results'],
    });
  }

  // Lotes
  async getLots(params?: Record<string, any>): Promise<InventoryLotResponse[]> {
    return this.getAll(params);
  }

  async getLotsPaginated(params?: Record<string, any>): Promise<PaginatedResponse<InventoryLotResponse>> {
    return this.getPaginated(params);
  }

  // Movimientos (usan el namespace base /inventory/movements)
  async getMovements(params?: Record<string, any>): Promise<PaginatedResponse<InventoryMovementResponse>> {
    return this.customRequest<PaginatedResponse<InventoryMovementResponse>>('../movements', 'GET', undefined, { params });
  }

  async createMovement(data: InventoryMovementInput): Promise<InventoryMovementResponse> {
    return this.customRequest<InventoryMovementResponse>('../movements', 'POST', data);
  }

  // Resúmenes y Alertas
  async getSummary(): Promise<InventorySummary> {
    return this.customRequest<InventorySummary>('../summary', 'GET');
  }

  async getAlerts(expiryDays: number = 30): Promise<InventoryAlerts> {
    return this.customRequest<InventoryAlerts>('../alerts', 'GET', undefined, {
      params: { expiry_days: expiryDays }
    });
  }
}

export const inventoryService = new InventoryService();
export default inventoryService;
