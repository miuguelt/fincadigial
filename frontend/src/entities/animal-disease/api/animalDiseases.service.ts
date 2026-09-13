import { BaseService } from '@/shared/api/base-service';
import type { AnimalDiseaseInput, PaginatedResponse, AnimalDiseaseResponse } from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for interacting with the animal diseases API.
 * @extends {BaseService<AnimalDiseaseResponse>}
 */
export class AnimalDiseasesService extends BaseService<AnimalDiseaseResponse> {
  /**
   * Creates an instance of AnimalDiseasesService.
   */
  constructor() {
    super('animal-diseases');
  }

  /**
   * Retrieves the complete follow-up of a disease episode: progress entries,
   * linked treatments (with medications and vaccines), vaccinations,
   * recommendations and the chart series for the evolution graphs.
   * @param {number | string} id - The episode ID.
   * @returns {Promise<any>} A promise that resolves to the follow-up payload.
   */
  public async getFollowup(id: number | string, cacheBust = false): Promise<any> {
    return this.customRequest<any>(
      `${id}/followup${cacheBust ? `?cache_bust=${Date.now()}` : ''}`,
      'GET',
      null,
      cacheBust ? { params: { cache_bust: Date.now() } } : {}
    );
  }

  /**
   * Closes a disease episode: marks the recovery status and the discharge
   * (recovery) date.
   * @param {number | string} id - The episode ID.
   * @param {{ status?: string; recovery_date?: string }} [data] - Close data.
   * @returns {Promise<AnimalDiseaseResponse>} The updated episode.
   */
  public async closeEpisode(
    id: number | string,
    data: { status?: string; recovery_date?: string } = {}
  ): Promise<AnimalDiseaseResponse> {
    return this.customRequest<AnimalDiseaseResponse>(
      `${id}/followup/close`,
      'POST',
      data
    );
  }

  /**
   * Episodes for the clinical case selector: id, animal/disease labels, status,
   * severity and the linked-record kinds (Tratamiento, Vacuna, Recomendación
   * profesional). Used by the treatment form to filter cases by kind.
   * @returns {Promise<any[]>} A promise that resolves to the case options list.
   */
  public async getCaseOptions(): Promise<any[]> {
    return this.customRequest<any[]>('case-options', 'GET');
  }

  /**
   * Retrieves a paginated list of animal diseases.
   * @param {object} [options] - Optional parameters for the request.
   * @param {number} [options.page=1] - The page number to retrieve.
   * @param {number} [options.limit=10] - The number of items per page.
   * @returns {Promise<PaginatedResponse<AnimalDiseaseResponse>>} A promise that resolves to the paginated list of animal diseases.
   */
  public async getAnimalDiseases(options: { page?: number; limit?: number; [key: string]: any } = {}): Promise<PaginatedResponse<AnimalDiseaseResponse>> {
    return this.getPaginated(options);
  }

  /**
   * Retrieves a single animal disease by its ID.
   * @param {string} id - The ID of the animal disease to retrieve.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the requested animal disease.
   */
  public async getAnimalDiseaseById(id: string): Promise<AnimalDiseaseResponse> {
    return this.getById(id);
  }

  /**
   * Creates a new animal disease.
   * @param {AnimalDiseaseInput} animalDiseaseData - The data for the new animal disease.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the created animal disease.
   */
  public async createAnimalDisease(animalDiseaseData: AnimalDiseaseInput): Promise<AnimalDiseaseResponse> {
    return this.create(animalDiseaseData);
  }

  /**
   * Updates an existing animal disease.
   * @param {string} id - The ID of the animal disease to update.
   * @param {Partial<AnimalDiseaseInput>} animalDiseaseData - The data to update the animal disease with.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the updated animal disease.
   */
  public async updateAnimalDisease(id: string, animalDiseaseData: Partial<AnimalDiseaseInput>): Promise<AnimalDiseaseResponse> {
    return this.update(id, animalDiseaseData);
  }

  /**
   * Partially updates an existing animal disease.
   * @param {string} id - The ID of the animal disease to update.
   * @param {Partial<AnimalDiseaseInput>} animalDiseaseData - The data to update the animal disease with.
   * @returns {Promise<AnimalDiseaseResponse>} A promise that resolves to the updated animal disease.
   */
  public async patchAnimalDisease(id: string, animalDiseaseData: Partial<AnimalDiseaseInput>): Promise<AnimalDiseaseResponse> {
    return this.patch(id, animalDiseaseData);
  }

  /**
   * Deletes an animal disease by its ID.
   * @param {string} id - The ID of the animal disease to delete.
   * @returns {Promise<boolean>} A promise that resolves when the animal disease is deleted.
   */
  public async deleteAnimalDisease(id: string): Promise<boolean> {
    return this.delete(id);
  }

  /**
   * Creates multiple animal diseases in a single request.
   * @param {AnimalDiseaseInput[]} data - An array of animal disease data.
   * @returns {Promise<any>} A promise that resolves to the response from the server.
   */
  public async createBulk(data: AnimalDiseaseInput[]): Promise<any> {
    return this.customRequest('bulk', 'POST', data);
  }

  /**
   * Retrieves statistics for the animal diseases.
   * @returns {Promise<any>} A promise that resolves to the animal disease statistics.
   */
  public async getAnimalDiseasesStats(): Promise<any> {
    return this.customRequest<any>('stats', 'GET');
  }
}

export const animalDiseasesService = new AnimalDiseasesService();
