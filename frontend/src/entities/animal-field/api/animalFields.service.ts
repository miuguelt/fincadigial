import { BaseService } from '@/shared/api/base-service';
import { clearServiceCaches } from '@/shared/api/service-registry';
import api from '@/shared/api/client';
import { readStandardErrorPayload } from '@/shared/api/error-parser';
import type { AnimalFieldInput, PaginatedResponse, AnimalFieldResponse } from '@/shared/api/generated/swaggerTypes';

export interface BulkTransferRequest {
  animal_ids: number[];
  field_id: number;
  date?: string;
  notes?: string;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  data: AnimalFieldResponse[];
  meta?: Record<string, any>;
}

export function normalizeBulkOperationResponse(
  body: any,
  fallbackMessage: string,
): BulkOperationResponse {
  const rows = Array.isArray(body?.data)
    ? body.data
    : Array.isArray(body)
      ? body
      : [];

  return {
    success: body?.success !== false,
    data: rows,
    message: body?.message || fallbackMessage,
    meta: body?.meta,
  };
}

const getBulkOperationErrorMessage = (error: any, fallback: string): string => {
  try {
    return readStandardErrorPayload(error).message || fallback;
  } catch {
    return error?.message || fallback;
  }
};

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
    const res = await this.create(data);
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return res;
  }

  async updateAnimalField(id: number | string, data: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    const res = await this.update(id, data);
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return res;
  }

  async patchAnimalField(id: string, data: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    const res = await this.patch(id, data);
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return res;
  }

  async deleteAnimalField(id: number | string): Promise<boolean> {
    const res = await this.delete(id);
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return res;
  }

  async createBulk(data: AnimalFieldInput[]): Promise<any> {
    const res = await this.customRequest('bulk', 'POST', data);
    await this.clearCache();
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return res;
  }

  async bulkTransfer(data: BulkTransferRequest): Promise<BulkOperationResponse> {
    try {
      // customRequest intentionally unwraps `data`; this endpoint also returns
      // `meta` with skipped animals, so keep the complete response envelope.
      const response = await api.post(`${this.endpoint}/transfer`, data);
      const result = normalizeBulkOperationResponse(
        response.data,
        `${data.animal_ids.length} animales trasladados exitosamente`,
      );
      await this.clearCache();
      // El traslado cambia la ocupación del potrero y la ubicación del animal:
      // sin esto las tarjetas seguían mostrando el conteo anterior.
      await clearServiceCaches('fields', 'animals');
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
      return result;
    } catch (e: any) {
      return {
        success: false,
        data: [],
        message: getBulkOperationErrorMessage(e, 'Error en traslado masivo'),
      };
    }
  }

  async bulkRemove(data: { animal_ids: number[]; date?: string }): Promise<BulkOperationResponse> {
    try {
      const response = await api.post(`${this.endpoint}/bulk-remove`, data);
      const result = normalizeBulkOperationResponse(
        response.data,
        `${data.animal_ids.length} animales retirados exitosamente`,
      );
      await this.clearCache();
      await clearServiceCaches('fields', 'animals');
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
      return result;
    } catch (e: any) {
      return {
        success: false,
        data: [],
        message: getBulkOperationErrorMessage(e, 'Error en retiro masivo'),
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
    const assignments = await this.getAll({ animal_id: animalId, limit: 100, cache_bust: Date.now() });
    if (!Array.isArray(assignments)) return true;
    const active = assignments.find(a => a.removal_date === null || a.removal_date === undefined);
    if (!active) return true;
    const today = new Date().toISOString().split('T')[0];
    await this.update(String(active.id), { removal_date: today });
    await this.clearCache();
    await clearServiceCaches('fields', 'animals');
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('animal-fields:updated'));
    return true;
  }
}

export const animalFieldsService = new AnimalFieldsService();
export default animalFieldsService;
