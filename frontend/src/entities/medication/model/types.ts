import { Treatment } from '@/entities/treatment/model/types';

export type route_administration = 'Oral' | 'Inyección' | 'Intranasal' | 'Tópica';

export interface Medications {
  id?: number;
  name: string;
  description: string;
  indications: string;
  contraindications: string;
  route_administration: route_administration;
  availability: boolean;

  treatments?: Treatment[];
}
