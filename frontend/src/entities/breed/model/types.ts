import { Species } from '@/entities/species/model/types';

export interface Breeds {
  id?: number;
  name: string;
  species_id: number;

  species?: Species;
}
