import type { FincaImage } from '@/entities/finca/api/fincaImage.service';

export interface FarmAdminKpis {
  total_animals?: number;
  total_animals_females?: number;
  total_animals_males?: number;
  total_milk_liters?: number;
  total_income?: number;
  total_expenses?: number;
  net_balance?: number;
  total_fields?: number;
  total_fields_area?: number;
}

export interface FarmAdminRecord {
  id: number;
  name: string;
  type: 'Educativa' | 'Tradicional';
  nit?: string;
  department?: string;
  municipality?: string;
  address?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  logo_url?: string;
  images?: FincaImage[];
  primary_image_url?: string;
  public_visibility?: 'minimal' | 'standard' | 'full';
  /** Indicadores agregados del endpoint comparativo de fincas. */
  kpis?: FarmAdminKpis;
  created_at?: string;
  updated_at?: string;
}

export type FarmAdminInput = Omit<FarmAdminRecord, 'id' | 'images' | 'primary_image_url' | 'created_at' | 'updated_at'>;
