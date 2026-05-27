import { Medications } from '@/entities/medication/model/types';
import { Treatment } from '@/entities/treatment/model/types';

export interface TreatmentMedications {
  id?: number;
  treatment_id: number;
  medication_id: number;

  treatments?: Treatment[];
  medications?: Medications;
}
