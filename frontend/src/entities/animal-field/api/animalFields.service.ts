import { BaseService } from '@/shared/api/base-service';
import type { AnimalFieldInput, PaginatedResponse, AnimalFieldResponse } from '@/shared/api/generated/swaggerTypes';

export interface BulkTransferRequest {
  animal_ids: number[];
  field_id: number;
  date?: string;
  notes?: string;
}

/**
 * Servicio consolidado para operaciones de asignación animal-potrero.
 * Unifica CRUD, traslados masivos, historial y estadísticas.
 */
export class AnimalFieldsService extends BaseService<AnimalFieldResponse> {
  constructor() {
    super('animal-fields', {
      enableCache: true,
      preferredListKeys: ['items', 'results', 'data'],
    });
  }

  async getAnimalFields(params?: Record<string, any>): Promise<AnimalFieldResponse[]> {
    return this.getAll(params);
  }

  async getAnimalFieldsPaginated(params?: Record<string, any>): Promise<PaginatedResponse<AnimalFieldResponse>> {
    return this.getPaginated(params);
  }

  async getAnimalFieldById(id: string): Promise<AnimalFieldResponse> {
    return this.getById(id);
  }

  async createAnimalField(data: AnimalFieldInput): Promise<AnimalFieldResponse> {
    return this.create(data);
  }

  async updateAnimalField(id: number | string, data: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    return this.update(id, data);
  }

  async patchAnimalField(id: string, data: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    return this.patch(id, data);
  }

  async deleteAnimalField(id: number | string): Promise<boolean> {
    return this.delete(id);
  }

  async createBulk(data: AnimalFieldInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  async bulkTransfer(data: BulkTransferRequest): Promise<{ success: boolean; message: string; data: AnimalFieldResponse[]; meta?: Record<string, any> }> {
    try {
      const res = await this.customRequest<AnimalFieldResponse[]>('transfer', 'POST', data);
      await this.clearCache();
      return {
        success: true,
        data: res,
        message: `${Array.isArray(res) ? res.length : 0} animales trasladados exitosamente`,
      };
    } catch (e: any) {
      return {
        success: false,
        data: [],
        message: e?.message || 'Error en traslado masivo',
      };
    }
  }

  async bulkRemove(data: { animal_ids: number[]; date?: string }): Promise<{ success: boolean; message: string; data: AnimalFieldResponse[]; meta?: Record<string, any> }> {
    try {
      const res = await this.customRequest<AnimalFieldResponse[]>('bulk-remove', 'POST', data);
      await this.clearCache();
      return {
        success: true,
        data: res,
        message: `${Array.isArray(res) ? res.length : 0} animales retirados exitosamente`,
      };
    } catch (e: any) {
      return {
        success: false,
        data: [],
        message: e?.message || 'Error en retiro masivo',
      };
    }
  }

  async getAnimalHistory(animalId: number): Promise<AnimalFieldResponse[]> {
    return this.getAll({ animal_id: animalId, sort_by: 'assignment_date', order: 'desc' });
  }

  async getStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }

  async getAnimalFieldsStats(): Promise<any> {
    return this.getStats();
  }

  async removeFromField(animalId: number): Promise<boolean> {
    const assignments = await this.getAll({ animal_id: animalId, limit: 100 });
    if (!Array.isArray(assignments)) return true;
    const active = assignments.find(a => a.removal_date === null || a.removal_date === undefined);
    if (!active) return true;
    const today = new Date().toISOString().split('T')[0];
    await this.update(String(active.id), { removal_date: today });
    return true;
  }
}

export const animalFieldsService = new AnimalFieldsService();
export default animalFieldsService;
