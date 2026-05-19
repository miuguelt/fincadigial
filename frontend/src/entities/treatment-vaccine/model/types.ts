import { Treatment } from '@/entities/treatment/model/types';
import { Vaccines } from '@/entities/vaccine/model/types';

export interface TreatmentVaccines {
  id?: number;
  treatment_id: number | undefined;
  vaccine_id: number;

  treatments?: Treatment[];
  vaccines?: Vaccines;
}