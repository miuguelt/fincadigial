import { BaseService } from '@/shared/api/base-service';
import type { PaginatedResponse } from '@/shared/api/generated/swaggerTypes';
import type {
  ClimateRiskAlert,
  CropActivity,
  CropPlot,
  MarketOffer,
  OfflineLearningMaterial,
  TechnicalAssistanceRequest,
  WaterMeasurement,
  WaterSource,
} from '../model/types';

class RuralCrudService<T extends { id?: number | string }> extends BaseService<T> {
  list(params: Record<string, any> = {}): Promise<PaginatedResponse<T>> {
    return this.getPaginated(params);
  }

  getOne(id: number | string): Promise<T> {
    return this.getById(id);
  }

  createOne(data: Partial<T>): Promise<T> {
    return this.create(data);
  }

  updateOne(id: number | string, data: Partial<T>): Promise<T> {
    return this.update(id, data);
  }

  patchOne(id: number | string, data: Partial<T>): Promise<T> {
    return this.patch(id, data);
  }

  deleteOne(id: number | string): Promise<boolean> {
    return this.delete(id);
  }
}

export const cropPlotsService = new RuralCrudService<CropPlot>('crop-plots');
export const cropActivitiesService = new RuralCrudService<CropActivity>('crop-activities');
export const waterSourcesService = new RuralCrudService<WaterSource>('water-sources');
export const waterMeasurementsService = new RuralCrudService<WaterMeasurement>('water-measurements');
export const climateRisksService = new RuralCrudService<ClimateRiskAlert>('climate-risks');
export const marketOffersService = new RuralCrudService<MarketOffer>('market-offers');
export const technicalAssistanceService = new RuralCrudService<TechnicalAssistanceRequest>('technical-assistance');
export const offlineLearningService = new RuralCrudService<OfflineLearningMaterial>('offline-learning');

export const campesinoServices = {
  cropPlots: cropPlotsService,
  cropActivities: cropActivitiesService,
  waterSources: waterSourcesService,
  waterMeasurements: waterMeasurementsService,
  climateRisks: climateRisksService,
  marketOffers: marketOffersService,
  technicalAssistance: technicalAssistanceService,
  offlineLearning: offlineLearningService,
};

