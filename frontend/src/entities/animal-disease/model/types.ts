import { Animals } from '@/entities/animal/model/types';
import { Diseases } from '@/entities/disease/model/types';

export interface AnimalDiseases {
  id?: number;
  animal_id: number;
  disease_id: number;
  instructor_id?: number;
  diagnosis_date: string;
  status: 'Activo' | 'En tratamiento' | 'Recuperado' | 'Crónico' | undefined;

  animals?: Animals;
  diseases?: Diseases[];
}
