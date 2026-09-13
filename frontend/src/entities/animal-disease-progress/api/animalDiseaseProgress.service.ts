import { BaseService } from '@/shared/api/base-service';
import type {
  AnimalDiseaseProgressInput,
  AnimalDiseaseProgressResponse,
  PaginatedResponse,
} from '@/shared/api/generated/swaggerTypes';

/**
 * Service class for the clinical progress entries of a disease episode.
 * @extends {BaseService<AnimalDiseaseProgressResponse>}
 */
export class AnimalDiseaseProgressService extends BaseService<AnimalDiseaseProgressResponse> {
  constructor() {
    super('animal-disease-progress');
  }

  public async getProgress(
    options: { page?: number; limit?: number; [key: string]: any } = {}
  ): Promise<PaginatedResponse<AnimalDiseaseProgressResponse>> {
    return this.getPaginated(options);
  }

  public async getProgressById(id: string): Promise<AnimalDiseaseProgressResponse> {
    return this.getById(id);
  }

  public async createProgress(
    data: AnimalDiseaseProgressInput
  ): Promise<AnimalDiseaseProgressResponse> {
    return this.create(data);
  }

  public async updateProgress(
    id: string,
    data: Partial<AnimalDiseaseProgressInput>
  ): Promise<AnimalDiseaseProgressResponse> {
    return this.update(id, data);
  }

  public async deleteProgress(id: string): Promise<boolean> {
    return this.delete(id);
  }
}

export const animalDiseaseProgressService = new AnimalDiseaseProgressService();
