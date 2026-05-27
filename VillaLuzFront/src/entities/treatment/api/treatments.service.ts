import { BaseService } from '@/shared/api/base-service';
import type { TreatmentInput, PaginatedResponse, TreatmentResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the treatments API.
 * @extends {BaseService<TreatmentResponse>}
 */
export class TreatmentsService extends BaseService<TreatmentResponse> {
  /**
   * Creates an instance of TreatmentsService.
   */
  constructor() {
    super('treatments');
  }

  // Helper to normalize different date shape inputs to YYYY-MM-DD or undefined
  private normalizeDate(value: any): string | undefined {
    if (!value) return undefined;
    if (typeof value === 'string') {
      const s = value.trim();
      return s || undefined;
    }
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'object') {
      // Dayjs-like object { $d: Date }
      const d = (value as any).$d;
      if (d instanceof Date) return d.toISOString().slice(0, 10);
      // Generic wrappers with value property
      const v = (value as any).value;
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return undefined;
  }

  /**
   * Internal helper to normalize frontend payload to backend expected fields.
   * - Maps diagnosis -> description (backend no longer accepts "diagnosis")
   * - Maps treatment_date -> treatment_date (legacy backend expects treatment_date)
   * - Removes undefined/null and strips unsupported keys
   */
  private buildApiPayload(data: Partial<TreatmentInput> & { [k: string]: any }): Record<string, any> {
    console.log('[TreatmentService] buildApiPayload input data:', data);

    const startDateRaw = data.treatment_date ?? (data as any).startDate ?? data.treatment_date ?? (data as any).date;
    const startDate = this.normalizeDate(startDateRaw);

    console.log('[TreatmentService] startDateRaw:', startDateRaw, '| normalized:', startDate);

    const payload: Record<string, any> = {
      animal_id: data.animal_id,
      // Prefer explicit treatment_date if present, otherwise map from treatment_date
      treatment_date: startDate,
      // Use description or fall back to diagnosis (UI label "Diagnóstico")
      // Check if description has actual content, otherwise use diagnosis
      description: (data.description && data.description.trim())
        ? data.description
        : ((data as any).diagnosis ?? data.description),
      // Optional fields commonly used in current UI
      dosis: (data as any).dosis,
      frequency: (data as any).frequency,
      observations: (data as any).observations,
      treatment_type: data.treatment_type,
      // Keep other optional metadata if provided
      veterinarian: (data as any).veterinarian,
      symptoms: (data as any).symptoms,
      treatment_plan: (data as any).treatment_plan,
      follow_up_date: (data as any).follow_up_date,
      cost: (data as any).cost,
      notes: (data as any).notes,
      status: (data as any).status,
      end_date: (data as any).end_date,
    };

    // Remove keys with undefined, null, empty string or empty plain object values
    Object.keys(payload).forEach((k) => {
      const v = (payload as any)[k];
      if (
        v === undefined ||
        v === null ||
        (typeof v === 'string' && v.trim() === '') ||
        (typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) && Object.keys(v).length === 0)
      ) {
        delete (payload as any)[k];
      }
    });

    console.log('[TreatmentService] Final payload after cleanup:', payload);
    return payload;
  }

  // Ensure mapping is applied for generic CRUD paths used by useResource
  public async create(data: any): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(data || {});
    return super.create(payload as any);
  }

  public async update(id: number | string, data: any): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(data || {});
    return super.update(id, payload as any);
  }

  public async patch(id: number | string, data: any): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(data || {});
    return super.patch(id, payload as any);
  }

  /**
   * Retrieves a paginated list of treatments.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<TreatmentResponse>>} A promise that resolves to the paginated list of treatments.
   */
  public async getTreatments(options: { page?: number; limit?: number;[key: string]: any } = {}): Promise<PaginatedResponse<TreatmentResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single treatment by its ID.
   * @param {string} id - The ID of the treatment to retrieve.
   * @returns {Promise<TreatmentResponse>} A promise that resolves to the requested treatment.
   */
  public async getTreatmentById(id: string): Promise<TreatmentResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new treatment.
   * @param {TreatmentInput} treatmentData - The data for the new treatment.
   * @returns {Promise<TreatmentResponse>} A promise that resolves to the created treatment.
   */
  public async createTreatment(treatmentData: TreatmentInput): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(treatmentData);
    return this.create(payload as any);
  }

  /**
   * Updates an existing treatment.
   * @param {string} id - The ID of the treatment to update.
   * @param {Partial<TreatmentInput>} treatmentData - The data to update the treatment with.
   * @returns {Promise<TreatmentResponse>} A promise that resolves to the updated treatment.
   */
  public async updateTreatment(id: string, treatmentData: Partial<TreatmentInput>): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(treatmentData);
    return this.update(id, payload as any);
  }

  /**
   * Partially updates an existing treatment.
   * @param {string} id - The ID of the treatment to update.
   * @param {Partial<TreatmentInput>} treatmentData - The data to update the treatment with.
   * @returns {Promise<TreatmentResponse>} A promise that resolves to the updated treatment.
   */
  public async patchTreatment(id: string, treatmentData: Partial<TreatmentInput>): Promise<TreatmentResponse> {
    const payload = this.buildApiPayload(treatmentData);
    return this.patch(id, payload as any);
  }

  /**
   * Deletes a treatment by its ID.
   * @param {string} id - The ID of the treatment to delete.
   * @returns {Promise<boolean>} A promise that resolves when the treatment is deleted.
   */
  public async deleteTreatment(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple treatments in a single request.
   * @param {TreatmentInput[]} data - An array of treatment data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: TreatmentInput[]): Promise<any> {
    // Normalize each element to the API payload
    const normalized = (data || []).map((d) => this.buildApiPayload(d));
    return this.customRequest('bulk', 'POST', normalized);
  }

  /**
   * Retrieves statistics for the treatments.
   * @returns {Promise<any>} A promise that resolves to the treatment statistics.
   */
  public async getTreatmentsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }

  /**
   * Creates a treatment and its associated vaccines and medications in a single operation.
   * This handles the orchestration on the client side since the backend doesn't support nested creation yet.
   */
  public async createUnifiedTreatment(
    treatmentData: TreatmentInput,
    vaccines: Array<{ vaccine_id: number; dose?: string }>,
    medications: Array<{ medication_id: number }>
  ): Promise<TreatmentResponse> {
    // 1. Create the base treatment
    const treatment = await this.createTreatment(treatmentData);
    const treatmentId = treatment.id;

    // 2. We need to import the services dynamically to avoid circular dependencies
    // or just use fetch/axios directly. But since we are in the frontend, dynamic import is better.
    try {
      const [{ treatmentVaccinesService }, { treatmentMedicationService }] = await Promise.all([
        import('@/entities/treatment-vaccine/api/treatmentVaccines.service'),
        import('@/entities/treatment-medication/api/treatmentMedication.service')
      ]);

      const promises: Promise<any>[] = [];

      if (vaccines && vaccines.length > 0) {
        const payload = vaccines.map(v => ({
          treatment_id: treatmentId,
          vaccine_id: v.vaccine_id,
          dose: v.dose || '1 dosis'
        }));
        if (payload.length === 1) {
          promises.push(treatmentVaccinesService.createTreatmentVaccine(payload[0] as any));
        } else {
          promises.push((treatmentVaccinesService as any).createBulk(payload));
        }
      }

      if (medications && medications.length > 0) {
        const payload = medications.map(m => ({
          treatment_id: treatmentId,
          medication_id: m.medication_id
        }));
        if (payload.length === 1) {
          promises.push(treatmentMedicationService.createTreatmentMedication(payload[0] as any));
        } else {
          promises.push((treatmentMedicationService as any).createBulk(payload));
        }
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
    } catch (error) {
      console.error('[TreatmentsService] Error creating unified treatment associations:', error);
      // We still return the created treatment, but ideally we'd show a warning
    }

    return treatment;
  }
}

export const treatmentsService = new TreatmentsService();
