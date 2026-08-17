import { AnimalFields } from '@/entities/animal-field/model/types';
import { FoodTypes } from '@/entities/food-type/model/types';

export type state = 'Disponible' | 'Ocupado' | 'Mantenimiento' | 'Restringido';

export interface Fields {
  id?: number;
  name: string;
  location: string;
  capacity: string;
  state: state;
  management: string;
  measurements: string;
  area: string;
  food_type_id?: number;
  animal_count?: number;

  food_types?: FoodTypes;
  animalFields?: AnimalFields[];
}
