import { describe, it, expect } from 'vitest';
import {
  buildTreatmentsFormSections,
  buildTreatmentFilterItems,
} from '@/pages/dashboard/admin/sanidad/sanidadTreatmentsConfig';

const episodeOptions = [
  { value: 1, animal_id: 10, label: 'BOV-001 · Mastitis clínica · Activo' },
  { value: 2, animal_id: 10, label: 'BOV-001 · Fiebre aftosa · Activo' },
  { value: 3, animal_id: 11, label: 'BOV-002 · Retención placentaria · Activo' },
  { value: 4, animal_id: 12, label: 'BOV-003 · Listeriosis · Recuperado' },
  { value: 5, animal_id: 13, label: 'BOV-004 · Metritis · Crónico' },
] as any[];

function buildSections() {
  return buildTreatmentsFormSections({
    animalOptions: [],
    userOptions: [],
    episodeOptions,
  });
}

describe('sanidadTreatmentsConfig: relación entre res y caso clínico', () => {
  it('filtra los casos para mostrar solo los de la res elegida', () => {
    const fields = buildSections().flatMap((s) => s.fields);
    const caseField = fields.find((f) => String(f.name) === 'animal_disease_id');
    expect(caseField?.dependsOn).toBe('animal_id');
    expect(typeof caseField?.optionsFilter).toBe('function');
    expect((caseField as any).optionsFilter(10, episodeOptions).map((o: any) => o.value)).toEqual([1, 2]);
    expect((caseField as any).optionsFilter(11, episodeOptions).map((o: any) => o.value)).toEqual([3]);
    expect((caseField as any).optionsFilter(undefined, episodeOptions)).toEqual([]);
  });
});

describe('buildTreatmentFilterItems: filtros rápidos en memoria', () => {
  const base = {
    id: 1,
    animal_id: 1,
    description: 'Dx',
    dosis: '10 ml',
    frequency: 'Única',
    treatment_date: new Date().toISOString().slice(0, 10),
  };

  it('recientes incluye solo los últimos 30 días', () => {
    const items = [
      { ...base, id: 1, treatment_date: new Date().toISOString().slice(0, 10) },
      { ...base, id: 2, treatment_date: '2020-01-01' },
    ];
    const result = buildTreatmentFilterItems('recientes')(items as any);
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it('con inversión incluye solo costos positivos', () => {
    const items = [
      { ...base, id: 1, cost: 25000 },
      { ...base, id: 2, cost: 0 },
      { ...base, id: 3, cost: undefined },
    ];
    const result = buildTreatmentFilterItems('con_costo')(items as any);
    expect(result.map((i) => i.id)).toEqual([1]);
  });

  it('retiro incluye retiros aún vigentes y descarta los cumplidos', () => {
    const items = [
      { ...base, id: 1, withdrawal_days: 5, treatment_date: new Date().toISOString().slice(0, 10) },
      { ...base, id: 2, withdrawal_days: 30, treatment_date: '2020-01-01' },
      { ...base, id: 3, withdrawal_days: 0 },
    ];
    const result = buildTreatmentFilterItems('retiro')(items as any);
    expect(result.map((i) => i.id)).toEqual([1]);
  });
});
