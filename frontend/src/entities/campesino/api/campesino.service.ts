import { BaseService } from '@/shared/api/base-service';
import type { PaginatedResponse } from '@/shared/api/generated/swaggerTypes';
import type {
  AssistanceCreateResult,
  AssistanceInbox,
  AssistanceNetwork,
  ClimateRiskAlert,
  CropActivity,
  CropPlot,
  MarketOffer,
  MyAssistanceRequests,
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

class TechnicalAssistanceService extends RuralCrudService<TechnicalAssistanceRequest> {
  constructor() {
    super('technical-assistance');
  }

  getNetwork(): Promise<AssistanceNetwork> {
    return this.customRequest<AssistanceNetwork>('network', 'GET', null, { cache: false });
  }

  getMine(limit = 50): Promise<MyAssistanceRequests> {
    return this.customRequest<MyAssistanceRequests>('mine', 'GET', null, {
      params: { limit, cache_bust: Date.now() },
      cache: false,
    });
  }

  createRequest(data: Pick<TechnicalAssistanceRequest, 'title' | 'category' | 'description' | 'priority'>): Promise<AssistanceCreateResult> {
    return this.customRequest<AssistanceCreateResult>('request', 'POST', data);
  }

  getInbox(limit = 50): Promise<AssistanceInbox> {
    return this.customRequest<AssistanceInbox>('inbox', 'GET', null, {
      params: { limit, cache_bust: Date.now() },
      cache: false,
    });
  }

  claim(requestId: number): Promise<TechnicalAssistanceRequest> {
    return this.customRequest<TechnicalAssistanceRequest>(`${requestId}/claim`, 'POST', {});
  }

  respond(requestId: number, notes: string, resolved = true): Promise<TechnicalAssistanceRequest> {
    return this.customRequest<TechnicalAssistanceRequest>(`${requestId}/respond`, 'POST', { notes, resolved });
  }

  cancelRequest(requestId: number): Promise<TechnicalAssistanceRequest> {
    return this.customRequest<TechnicalAssistanceRequest>(`${requestId}/cancel`, 'POST', {});
  }
}

export const cropPlotsService = new RuralCrudService<CropPlot>('crop-plots');
export const cropActivitiesService = new RuralCrudService<CropActivity>('crop-activities');
export const waterSourcesService = new RuralCrudService<WaterSource>('water-sources');
export const waterMeasurementsService = new RuralCrudService<WaterMeasurement>('water-measurements');
export const climateRisksService = new RuralCrudService<ClimateRiskAlert>('climate-risks');
export const marketOffersService = new RuralCrudService<MarketOffer>('market-offers');
export const technicalAssistanceService = new TechnicalAssistanceService();
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
