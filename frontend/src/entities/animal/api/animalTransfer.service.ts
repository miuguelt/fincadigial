import api from '@/shared/api/client';

export interface AnimalRegistrationResult {
  registration_status: 'CREATED_LOCAL' | 'TRANSFER_PENDING' | 'SOLD_PENDING_TRANSFER' | string;
  animal?: any;
  claim?: any;
  identity?: any;
  message?: string;
  claim_code?: string;
  transfer?: any;
}

export interface AnimalSaleResult {
  registration_status: 'SOLD_PENDING_TRANSFER' | string;
  claim_code: string;
  transfer: any;
  animal: any;
}

function unwrap<T>(response: any): T {
  return (response?.data?.data ?? response?.data ?? response) as T;
}

/**
 * Operaciones de identidad/transferencia. No usa BaseService porque una
 * verificación o aceptación no puede encolarse offline y parecer exitosa.
 */
export const animalTransferService = {
  async registerOrClaim(payload: Record<string, any>): Promise<AnimalRegistrationResult> {
    const response = await api.post('/animals/transfers/register', payload, {
      headers: { 'X-Idempotency-Key': `animal-register-${Date.now()}-${Math.random().toString(36).slice(2)}` },
    });
    return unwrap<AnimalRegistrationResult>(response);
  },

  async markSold(payload: Record<string, any>): Promise<AnimalSaleResult> {
    const response = await api.post('/animals/transfers/sell', payload, {
      headers: { 'X-Idempotency-Key': `animal-sale-${payload.animal_id}-${payload.sale_date || ''}` },
    });
    return unwrap<AnimalSaleResult>(response);
  },

  async decideClaim(claimId: number, approve: boolean, note?: string): Promise<any> {
    const response = await api.post(`/animals/transfers/claims/${claimId}/decision`, { approve, note });
    return unwrap<any>(response);
  },

  async getPortableHistory(animalId: number, limit = 100): Promise<any> {
    const response = await api.get(`/animals/transfers/${animalId}/portable-history`, { params: { limit } });
    return unwrap<any>(response);
  },
};

export default animalTransferService;

