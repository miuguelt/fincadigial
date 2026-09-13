import { BaseService } from '@/shared/api/base-service';
import type { PaginatedResponse } from '@/shared/api/generated/swaggerTypes';
import type {
  ProtocolApplyPayload,
  TreatmentProtocolRow,
} from '../model/types';

/** Servicio del catálogo de protocolos de tratamiento (por finca). */
export class TreatmentProtocolsService extends BaseService<TreatmentProtocolRow> {
  constructor() {
    super('treatment-protocols', {
      cacheTimeout: 60 * 1000,
      persistCache: true,
    });
  }

  async getProtocols(
    options: { page?: number; limit?: number; [key: string]: any } = {},
  ): Promise<PaginatedResponse<TreatmentProtocolRow>> {
    return this.getPaginated(options);
  }

  /** Aplica un protocolo a una res: crea el Treatment trazable. */
  async applyProtocol(
    protocolId: number | string,
    payload: ProtocolApplyPayload,
  ): Promise<any> {
    return this.customRequest(`${protocolId}/apply`, 'POST', payload);
  }
}

export const treatmentProtocolsService = new TreatmentProtocolsService();
