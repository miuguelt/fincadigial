import { Animals } from '@/entities/animal/model/types';
import { Fields } from '@/entities/field/model/types';

export interface AnimalFields {
  id?: number;
  assignment_date: string;
  removal_date?: string;
  duration?: string;
  animal_id: number;
  field_id: number;
  reason?: string;
  notes?: string;
  status?: boolean | string;
  is_active?: boolean;

  animals?: Animals;
  fields?: Fields;

  animal_record?: string;
  field_name?: string;
  created_at?: string;
  updated_at?: string;
}