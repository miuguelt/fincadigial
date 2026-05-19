import { Animals } from '@/entities/animal/model/types';

export type health_status = 'Excelente' | 'Bueno' | 'Regular' | 'Malo';

export interface Control {
  id?: number;
  checkup_date: string;
  health_status: health_status;
  description: string;
  animal_id: number;

  healt_status?: health_status;

  animals?: Animals;
}