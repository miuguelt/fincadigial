import { Animals } from '@/entities/animal/model/types';

export interface Diseases {
  id?: number;
  name: string;
  symptoms: string;
  details: string;

  animals?: Animals[];
}