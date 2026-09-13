import type { AnimalDiseaseResponse, AnimalDiseaseInput } from '@/shared/api/generated/swaggerTypes';
import type { CRUDFieldType, CRUDFormSection } from '@/shared/types/crud';
import { ANIMAL_DISEASE_STATUSES, ANIMAL_DISEASE_SEVERITIES } from '@/shared/constants/enums';
import { getTodayColombia } from '@/shared/utils/dateUtils';

export type CaseRow = AnimalDiseaseResponse & { [k: string]: any };

export interface LookupOption {
  value: number | string;
  label: string;
}

export interface CasesLookupOptions {
  animalOptions: LookupOption[];
  animalLoading: boolean;
  diseaseOptions: LookupOption[];
  diseaseLoading: boolean;
  instructorOptions: LookupOption[];
  instructorLoading: boolean;
}

export function buildCasesFormSections({
  animalOptions,
  animalLoading,
  diseaseOptions,
  diseaseLoading,
  instructorOptions,
  instructorLoading,
}: CasesLookupOptions): CRUDFormSection<any>[] {
  return [
    {
      title: 'Datos de la enfermedad',
      gridCols: 2,
      fields: [
        { name: 'animal_id' as any, label: '¿Cuál res necesita atención?', type: 'select' as CRUDFieldType, required: true, options: animalOptions, placeholder: 'Seleccione la res', loading: animalLoading },
        { name: 'disease_id' as any, label: '¿Qué tiene la res?', type: 'select' as CRUDFieldType, required: true, options: diseaseOptions, placeholder: 'Seleccione la enfermedad', loading: diseaseLoading },
        { name: 'instructor_id' as any, label: '¿Quién la atiende?', type: 'select' as CRUDFieldType, required: true, options: instructorOptions, placeholder: 'Seleccione el encargado o veterinario', loading: instructorLoading },
        { name: 'diagnosis_date' as any, label: '¿Desde cuándo está enferma?', type: 'date' as CRUDFieldType, required: true },
        { name: 'status' as any, label: 'Estado actual', type: 'select' as CRUDFieldType, options: ANIMAL_DISEASE_STATUSES as any, placeholder: 'Seleccione el estado' },
        { name: 'severity' as any, label: '¿Qué tan grave está?', type: 'select' as CRUDFieldType, options: ANIMAL_DISEASE_SEVERITIES as any, placeholder: 'Seleccione la gravedad' },
        { name: 'recovery_date' as any, label: 'Fecha de alta (si ya sanó)', type: 'date' as CRUDFieldType },
        { name: 'notes' as any, label: 'Observaciones o síntomas', type: 'textarea' as CRUDFieldType, placeholder: 'Escriba aquí si la res tiene fiebre, no come, o qué medicamentos se le están dando...', colSpan: 2 },
      ],
    },
  ];
}

/** Mapeo de respuesta a formulario. */
export const mapResponseToForm = (item: CaseRow): AnimalDiseaseInput & { [k: string]: any } => ({
  animal_id: item.animal_id,
  disease_id: item.disease_id,
  instructor_id: item.instructor_id,
  diagnosis_date: item.diagnosis_date,
  status: item.status,
  severity: item.severity,
  recovery_date: item.recovery_date || '',
  notes: item.notes || '',
});

/** Validación de formulario con mensajes claros para el campo. */
export const validateForm = (formData: AnimalDiseaseInput & { [k: string]: any }): string | null => {
  const animalId = Number(formData.animal_id);
  if (!formData.animal_id || Number.isNaN(animalId) || animalId <= 0) {
    return 'Debe seleccionar qué res está enferma.';
  }
  const diseaseId = Number(formData.disease_id);
  if (!formData.disease_id || Number.isNaN(diseaseId) || diseaseId <= 0) {
    return 'Debe seleccionar la enfermedad que tiene la res.';
  }
  const instructorId = Number(formData.instructor_id);
  if (!formData.instructor_id || Number.isNaN(instructorId) || instructorId <= 0) {
    return 'Debe decirnos quién está a cargo de tratar la res.';
  }
  if (!formData.diagnosis_date) return 'La fecha en que se dio cuenta de la enfermedad es obligatoria.';
  if (formData.recovery_date && formData.diagnosis_date) {
    if (formData.recovery_date < formData.diagnosis_date) {
      return 'La fecha de alta no puede ser anterior al diagnóstico.';
    }
  }
  return null;
};

/** Datos iniciales del formulario. */
export const initialFormData: AnimalDiseaseInput & { [k: string]: any } = {
  animal_id: undefined as any,
  disease_id: undefined as any,
  instructor_id: undefined as any,
  diagnosis_date: getTodayColombia(),
  status: ANIMAL_DISEASE_STATUSES[0]?.value ?? 'Activo',
  severity: undefined as any,
  recovery_date: '' as any,
  notes: '',
};
