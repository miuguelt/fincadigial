export interface CropFormData {
  crop_plot_id: string;
  activity_type: string;
  activity_date: string;
  description: string;
  input_name: string;
  quantity: string;
  unit: string;
  cost: string;
  notes: string;
}

export interface MilkFormData {
  animalId: string;
  liters: string;
  session: string;
  date: string;
  notes: string;
}

export interface TransferFormData {
  animalId: string;
  fieldId: string;
  date: string;
}

export interface DiseaseFormData {
  animalId: string;
  diseaseId: string;
  status: string;
  date: string;
  notes: string;
}

export interface TreatmentFormData {
  animalId: string;
  medicationId: string;
  dose: string;
  /** Obligatorio en el backend (`Treatments.frequency`). */
  frequency: string;
  date: string;
  description: string;
  observations?: string;
}

export interface ActivityConfig {
  value: string;
  label: string;
  emoji: string;
  color: string;
  border: string;
}

export interface HistoryRecord {
  id: string;
  type: 'milking' | 'transfer' | 'disease' | 'treatment' | 'finance' | 'control';
  date: string;
  animalId?: number;
  animalLabel?: string;
  entityId?: number;
  entityLabel?: string;
  details: string;
  notes?: string;
  raw: any;
}

export interface FinanceFormData {
  transaction_type: 'Ingreso' | 'Gasto';
  category: string;
  animalId?: string;
  amount: string;
  date: string;
  description: string;
}

export interface ControlFormData {
  animalId: string;
  weight: string;
  height?: string;
  health_status: 'Excelente' | 'Bueno' | 'Regular' | 'Malo' | 'Sano' | '';
  checkup_date: string;
  description?: string;
}
