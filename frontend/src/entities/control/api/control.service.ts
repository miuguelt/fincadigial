import { BaseService } from '@/shared/api/base-service';
import type { ControlInput, PaginatedResponse, ControlResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the controls API.
 * @extends {BaseService<Control>}
 */
export class ControlService extends BaseService<ControlResponse> {
  /**
   * Creates an instance of ControlService.
   */
  constructor() {
    super('control');
  }

  private mapData(data: any): any {
    const mapped = { ...data };
    if ('checkup_date' in mapped) {
      mapped.control_date = mapped.checkup_date;
      delete mapped.checkup_date;
    }
    return mapped;
  }

  public async getControls(options: { page?: number; limit?: number;[key: string]: any } = {}): Promise<PaginatedResponse<ControlResponse>> {
    return this.getPaginated(options);
  }

  public async getControlById(id: string): Promise<ControlResponse> {
    return this.getById(id);
  }

  public async createControl(controlData: ControlInput): Promise<ControlResponse> {
    return this.create(this.mapData(controlData));
  }

  public async updateControl(id: string, controlData: Partial<ControlInput>): Promise<ControlResponse> {
    return this.update(id, this.mapData(controlData));
  }

  public async patchControl(id: string, controlData: Partial<ControlInput>): Promise<ControlResponse> {
    return this.patch(id, this.mapData(controlData));
  }

  /**
   * Deletes a control by its ID.
   * @param {string} id - The ID of the control to delete.
   * @returns {Promise<boolean>} A promise that resolves when the control is deleted.
   */
  public async deleteControl(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple controls in a single request.
   * @param {ControlInput[]} data - An array of control data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: ControlInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the controls.
   * @returns {Promise<any>} A promise that resolves to the control statistics.
   */
  public async getControlsStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const controlService = new ControlService();
