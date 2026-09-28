import { describe, expect, it } from 'vitest';

import { buildCasesFormSections } from './sanidadCasesConfig';
import { validateFormSections } from '@/shared/utils/formValidation';

const emptyLookups = {
  animalOptions: [],
  animalLoading: false,
  diseaseOptions: [],
  diseaseLoading: false,
  instructorOptions: [],
  instructorLoading: false,
};

describe('sanidadCasesConfig', () => {
  it('declara como obligatorios los campos que el backend exige', () => {
    const fields = buildCasesFormSections(emptyLookups)[0].fields;

    expect(fields.filter((field) => field.required).map((field) => String(field.name))).toEqual([
      'animal_id',
      'disease_id',
      'instructor_id',
      'diagnosis_date',
      'status',
    ]);
  });

  it('devuelve un error identificable por cada campo obligatorio vacío', () => {
    const sections = buildCasesFormSections(emptyLookups);
    const validation = validateFormSections(sections, {
      animal_id: undefined,
      disease_id: undefined,
      instructor_id: undefined,
      diagnosis_date: '',
      status: '',
    });

    expect(Object.keys(validation.errors)).toEqual([
      'animal_id',
      'disease_id',
      'instructor_id',
      'diagnosis_date',
      'status',
    ]);
    expect(validation.messages).toHaveLength(5);
  });
});
