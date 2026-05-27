import { Animals } from '@/entities/animal/model/types';
import { Vaccines } from '@/entities/vaccine/model/types';

export interface Vaccinations {
  id?: number;
  animal_id: number;
  vaccine_id: number;
  application_date: string;
  apprentice_id?: number;
  instructor_id: number;

  animals?: Animals;
  vaccines?: Vaccines[];
}