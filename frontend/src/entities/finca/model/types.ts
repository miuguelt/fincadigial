export interface Finca {
  id: number;
  name: string;
  type: 'Educativa' | 'Tradicional';
  nit?: string;
  department?: string;
  municipality?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  is_active: boolean;
  logo_url?: string;
  ica_registration?: string;
  territory_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface FincaFormData {
  name: string;
  type: 'Educativa' | 'Tradicional';
  nit?: string;
  department?: string;
  municipality?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  logo_url?: string;
  ica_registration?: string;
  territory_id?: number;
}

export interface FincaFilters {
  search?: string;
  type?: 'Educativa' | 'Tradicional';
  department?: string;
  is_active?: boolean;
  page?: number;
  limit?: number;
}
