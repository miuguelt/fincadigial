import type { Animals } from "@/entities/animal/model/types";
// import { Fields } from "./fieldsTypes"; // Redundant if we use swagger types

/**
 * Interface for AnimalField (Traslado de potrero)
 * Based on swagger ReproductiveEventResponse but adapted for legacy components
 */
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
  fields?: any; // Simplified for now
  
  animal_record?: string;
  field_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

