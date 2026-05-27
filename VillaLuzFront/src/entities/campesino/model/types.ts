export type CropStatus = 'planned' | 'active' | 'harvested' | 'lost';
export type CropActivityType = 'sowing' | 'irrigation' | 'fertilization' | 'pest_control' | 'harvest' | 'note';
export type WaterSourceType = 'stream' | 'well' | 'reservoir' | 'rainwater' | 'public_supply' | 'other';
export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical';
export type MarketOfferType = 'sale' | 'purchase' | 'exchange';
export type AssistanceStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type LearningContentType = 'text' | 'audio' | 'video' | 'pdf' | 'image';

export interface CropPlot {
  id?: number;
  finca_id?: number;
  field_id?: number | null;
  name: string;
  crop_name: string;
  variety?: string | null;
  area?: number | null;
  area_unit?: string | null;
  sowing_date?: string | null;
  expected_harvest_date?: string | null;
  harvest_date?: string | null;
  status?: CropStatus;
  seed_source?: string | null;
  notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface CropActivity {
  id?: number;
  finca_id?: number;
  crop_plot_id: number;
  activity_type: CropActivityType;
  activity_date: string;
  description?: string | null;
  input_name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  cost?: number | null;
  performed_by?: number | null;
  attachment_blob_id?: number | null;
  notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface WaterSource {
  id?: number;
  finca_id?: number;
  territory_id?: number | null;
  name: string;
  source_type?: WaterSourceType;
  latitude?: number | null;
  longitude?: number | null;
  capacity_liters?: number | null;
  is_potable?: boolean | null;
  reliability?: string | null;
  notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface WaterMeasurement {
  id?: number;
  finca_id?: number;
  water_source_id: number;
  measured_at: string;
  level_percent?: number | null;
  flow_liters_minute?: number | null;
  ph?: number | null;
  turbidity?: number | null;
  rainfall_mm?: number | null;
  measured_by?: number | null;
  notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface ClimateRiskAlert {
  id?: number;
  finca_id?: number | null;
  territory_id?: number | null;
  title: string;
  risk_type: string;
  severity?: RiskSeverity;
  description?: string | null;
  recommendation?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  source?: string | null;
  is_active?: boolean;
  _is_offline_pending?: boolean;
}

export interface MarketOffer {
  id?: number;
  finca_id?: number;
  territory_id?: number | null;
  offer_type?: MarketOfferType;
  product_name: string;
  quantity?: number | null;
  unit?: string | null;
  price?: number | null;
  currency?: string | null;
  available_from?: string | null;
  available_until?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  delivery_location?: string | null;
  status?: string;
  notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface TechnicalAssistanceRequest {
  id?: number;
  finca_id?: number;
  territory_id?: number | null;
  requester_user_id?: number | null;
  assigned_user_id?: number | null;
  title: string;
  category: string;
  description?: string | null;
  priority?: string;
  status?: AssistanceStatus;
  requested_at?: string | null;
  resolved_at?: string | null;
  resolution_notes?: string | null;
  _is_offline_pending?: boolean;
}

export interface OfflineLearningMaterial {
  id?: number;
  territory_id?: number | null;
  title: string;
  category: string;
  content_type?: LearningContentType;
  summary?: string | null;
  local_uri?: string | null;
  attachment_blob_id?: number | null;
  language?: string | null;
  reading_level?: string | null;
  is_active?: boolean;
  _is_offline_pending?: boolean;
}

