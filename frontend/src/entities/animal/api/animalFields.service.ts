import { BaseService } from '@/shared/api/base-service';
import type { 
  AnimalFieldResponse, 
  AnimalFieldInput, 
  PaginatedResponse 
} from '@/shared/api/generated/swaggerTypes';
import type { APIResponse } from '@/shared/api/types';

export interface BulkTransferRequest {
  animal_ids: number[];
  field_id: number;
  date?: string;
  notes?: string;
}

/**
 * Service class for interacting with the animal fields API (Traslados de potrero).
 * Consolidates all animal-field related operations.
 */
class AnimalFieldsService extends BaseService<AnimalFieldResponse> {
  constructor() {
    super('animal-fields', {
      enableCache: true,
      preferredListKeys: ['items', 'results', 'data'],
    });
  }

  /**
   * Obtiene todos los traslados con filtros opcionales.
   */
  async getAnimalFields(params?: Record<string, any>): Promise<AnimalFieldResponse[]> {
    return this.getAll(params);
  }

  /**
   * Obtiene traslados paginados.
   */
  async getAnimalFieldsPaginated(params?: Record<string, any>): Promise<PaginatedResponse<AnimalFieldResponse>> {
    return this.getPaginated(params);
  }

  /**
   * Crea un nuevo registro de traslado.
   */
  async createAnimalField(data: AnimalFieldInput): Promise<AnimalFieldResponse> {
    return this.create(data);
  }

  /**
   * Actualiza un registro de traslado.
   */
  async updateAnimalField(id: number | string, data: Partial<AnimalFieldInput>): Promise<AnimalFieldResponse> {
    return this.update(id, data);
  }

  /**
   * Elimina un registro de traslado.
   */
  async deleteAnimalField(id: number | string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * TRASLADO MASIVO: Traslada múltiples animales a un nuevo potrero.
   * @param data Datos del traslado masivo
   */
  async bulkTransfer(data: BulkTransferRequest): Promise<APIResponse<AnimalFieldResponse[]>> {
    return this.customRequest<APIResponse<AnimalFieldResponse[]>>('transfer', 'POST', data);
  }

  /**
   * Obtiene el histórico de potreros de un animal específico.
   * @param animalId ID del animal
   */
  async getAnimalHistory(animalId: number): Promise<AnimalFieldResponse[]> {
    return this.getAll({ animal_id: animalId, sort_by: 'assignment_date', order: 'desc' });
  }

  /**
   * Obtiene estadísticas de ocupación de potreros.
   */
  async getStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const animalFieldsService = new AnimalFieldsService();
export default animalFieldsService;

