import type { CRUDFormSection } from '@/shared/types/crud';
import type { AnimalInput } from '@/shared/api/generated/swaggerTypes';
import { ANIMAL_GENDERS, ANIMAL_STATUS_OPTIONS } from './animals.config';

interface AnimalFormOptions {
  breedOptions: Array<{ value: string | number; label: string }>;
  fatherOptions: Array<{ value: string | number; label: string }>;
  motherOptions: Array<{ value: string | number; label: string }>;
}

export const buildAnimalFormSections = ({ breedOptions, fatherOptions, motherOptions }: AnimalFormOptions): CRUDFormSection<Partial<AnimalInput>>[] => [
  {
    title: 'Información Básica', gridCols: 3,
    fields: [
      { name: 'record', label: 'Registro', type: 'text', required: true, placeholder: 'Ej: REC0001' },
      { name: 'birth_date', label: 'Fecha de Nacimiento', type: 'date', required: true },
      { name: 'breeds_id', label: 'Raza', type: 'select', required: true, options: breedOptions, placeholder: 'Seleccionar raza' },
      { name: 'sex', label: 'Sexo', type: 'select', required: true, options: ANIMAL_GENDERS as any },
      { name: 'status', label: 'Estado', type: 'select', options: ANIMAL_STATUS_OPTIONS as any },
      { name: 'weight', label: 'Peso (kg)', type: 'number', required: true, placeholder: 'Ej: 250' },
    ],
  },
  {
    title: 'Genealogía y Adquisición', gridCols: 3,
    fields: [
      { name: 'idFather', label: 'Padre', type: 'select', options: fatherOptions, placeholder: 'Seleccionar padre', excludeSelf: true },
      { name: 'idMother', label: 'Madre', type: 'select', options: motherOptions, placeholder: 'Seleccionar madre', excludeSelf: true },
    ],
  },
  {
    title: 'Trazabilidad y Registro ICA', gridCols: 3,
    fields: [
      { name: 'entry_date', label: 'Fecha de Ingreso', type: 'date', placeholder: 'Fecha de llegada a la finca' },
      { name: 'purchase_date', label: 'Fecha de Compra', type: 'date', placeholder: 'Fecha de adquisición' },
      { name: 'exit_date', label: 'Fecha de Salida', type: 'date', placeholder: 'Fecha de egreso' },
      { name: 'sale_date', label: 'Fecha de Venta', type: 'date', placeholder: 'Fecha de comercialización' },
      { name: 'exit_reason', label: 'Motivo de Salida', type: 'text', placeholder: 'Ej: Venta, Traslado, Muerte' },
    ],
  },
];
