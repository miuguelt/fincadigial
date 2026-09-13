import type { AnimalDiseaseResponse } from '@/shared/api/generated/swaggerTypes';

export interface FollowupProgressEntry {
  id: number;
  animal_disease_id: number;
  progress_date: string;
  weight?: number | null;
  temperature?: number | null;
  status?: string | null;
  observation?: string | null;
  created_at?: string;
}

export interface FollowupMedication {
  id: number;
  medication_id: number;
  name?: string | null;
  dosis?: string | null;
  quantity?: number | null;
  lot_number?: string | null;
}

export interface FollowupTreatment {
  id: number;
  treatment_date: string;
  description: string;
  frequency: string;
  dosis: string;
  observations?: string | null;
  cost?: number | null;
  performed_by?: number | null;
  medications: FollowupMedication[];
  vaccines: { id: number; vaccine_id: number; name?: string | null }[];
}

export interface FollowupVaccination {
  id: number;
  vaccination_date: string;
  vaccine_id: number;
  vaccine_name?: string | null;
  dosis?: string | null;
  batch_number?: string | null;
  notes?: string | null;
}

export interface FollowupRecommendationControl {
  id: number;
  scheduled_date: string;
  control_date?: string | null;
  observation?: string | null;
  completed: boolean;
  recorded_by?: number | null;
}

export interface FollowupRecommendation {
  id: number;
  title: string;
  recommendation: string;
  responsible?: string | null;
  start_date: string;
  estimated_end_date: string;
  duration_days: number;
  control_interval_days: number;
  status?: string;
  final_notes?: string | null;
  controls: FollowupRecommendationControl[];
}

export interface FollowupControlEntry {
  id: number;
  checkup_date: string;
  health_status?: string;
  weight?: number | null;
  height?: number | null;
  description?: string | null;
}

export interface FollowupChartPoint {
  date: string;
  weight?: number | null;
  temperature?: number | null;
  status?: string | null;
  observation?: string | null;
  source: string;
}

export interface DiseaseFollowupData {
  episode: AnimalDiseaseResponse & {
    animal?: { id: number; record?: string; sex?: string; status?: string };
    disease?: { id: number; name?: string };
    instructor?: { id: number; fullname?: string; role?: string };
  };
  progress: FollowupProgressEntry[];
  treatments: FollowupTreatment[];
  vaccinations: FollowupVaccination[];
  recommendations: FollowupRecommendation[];
  controls: FollowupControlEntry[];
  chart: { series: FollowupChartPoint[] };
  closed: { code: string; message: string; duration_days?: number }[];
  status_options: {
    open: string[];
    resolved: string[];
    severity: string[];
  };
}
