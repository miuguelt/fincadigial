export interface TreatmentProtocolRow {
  id: number;
  name: string;
  description: string;
  disease_id?: number | null;
  disease?: { id: number; name?: string } | null;
  severity?: string | null;
  default_dosis?: string;
  default_frequency?: string;
  withdrawal_days?: number;
  duration_days?: number | null;
  is_default?: boolean;
  finca_id?: number;
  insumos?: Array<{
    id: number;
    kind?: string;
    medication_id?: number | null;
    vaccine_id?: number | null;
    recommended_dosis?: string | null;
    recommended_quantity?: number | null;
  }>;
}

export interface ProtocolApplyPayload {
  animal_id: number | string;
  animal_disease_id?: number | string | null;
  treatment_date?: string;
  dosis?: string;
  frequency?: string;
  observations?: string;
}
