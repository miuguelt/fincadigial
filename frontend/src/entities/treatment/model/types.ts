import { Animals } from '@/entities/animal/model/types';
import { TreatmentMedications } from '@/entities/treatment-medication/model/types';
import { TreatmentVaccines } from '@/entities/treatment-vaccine/model/types';

export interface Treatment {
  id?: number;
  treatment_date: string;
  end_date?: string;
  description: string;
  frequency: string;
  observations?: string;
  dosis: string;
  withdrawal_days?: number;
  withdrawal_end_date?: string;
  animal_id: number;
  finca_id?: number;
  performed_by?: number;
  cost?: number;
  treatment_type?: string;
  created_at?: string;
  updated_at?: string;

  animals?: Animals;
  vaccines_treatments?: TreatmentVaccines[];
  medication_treatments?: TreatmentMedications[];
}

export interface TreatmentFormData {
  treatment_date: string;
  description: string;
  frequency: string;
  dosis: string;
  observations?: string;
  withdrawal_days?: number;
  withdrawal_end_date?: string;
  animal_id: number;
  finca_id?: number;
  performed_by?: number;
  cost?: number;
}

export interface TreatmentFilters {
  search?: string;
  animal_id?: number;
  finca_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}