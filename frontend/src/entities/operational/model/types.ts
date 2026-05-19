export interface OperationalCost {
  id: number;
  concept: string;
  amount: number;
  date: string;
  category: string;
  finca_id: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AnimalGroup {
  id: number;
  name: string;
  description?: string;
  finca_id: number;
  animal_count?: number;
  created_at?: string;
}

export interface PastureAforo {
  id: number;
  field_id: number;
  entry_height?: number;
  exit_height?: number;
  pasture_quality: number;
  notes?: string;
  finca_id: number;
  created_at?: string;
}

export interface Infrastructure {
  id: number;
  name: string;
  type: 'Tanque de Leche' | 'Cerca Eléctrica' | 'Maquinaria' | 'Corral/Instalaciones' | 'Bebedero/Acueducto';
  last_maintenance?: string;
  next_maintenance?: string;
  status: 'Operativo' | 'Requiere Arreglo' | 'Crítico';
  finca_id: number;
  created_at?: string;
}

export interface OperationalFilters {
  search?: string;
  category?: string;
  finca_id?: number;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}
