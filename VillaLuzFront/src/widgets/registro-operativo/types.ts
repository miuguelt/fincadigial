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
  date: string;
  description: string;
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
  type: 'milking' | 'transfer' | 'disease' | 'treatment';
  date: string;
  animalId: number;
  animalLabel: string;
  entityId?: number;
  entityLabel?: string;
  details: string;
  notes?: string;
  raw: any;
}
