import { describe, expect, it } from 'vitest';
import { buildAnimalFormSections } from './formSections';

describe('buildAnimalFormSections', () => {
  const sections = buildAnimalFormSections({
    breedOptions: [{ value: 1, label: 'Holstein' }],
    fatherOptions: [],
    motherOptions: [],
  });
  const allFields = sections.flatMap((s) => s.fields);

  it('oculta los campos de salida y venta al crear un animal vivo nuevo', () => {
    const newAlive = { status: 'Vivo' };
    for (const name of ['exit_date', 'sale_date', 'exit_reason'] as const) {
      const field = allFields.find((f) => f.name === name);
      expect(field).toBeDefined();
      expect(field?.showIf?.(newAlive)).toBe(false);
    }
  });

  it('muestra los campos de salida y venta al editar o si el estado cambia a Vendido o Muerto', () => {
    for (const name of ['exit_date', 'sale_date', 'exit_reason'] as const) {
      const field = allFields.find((f) => f.name === name);
      expect(field?.showIf?.({ id: 5, status: 'Vivo' })).toBe(true);
      expect(field?.showIf?.({ status: 'Vendido' })).toBe(true);
      expect(field?.showIf?.({ status: 'Muerto' })).toBe(true);
    }
  });

  it('mantiene un tratamiento consistente en tú en ayudas y etiquetas', () => {
    const texts = allFields
      .flatMap((f) => [f.label, f.placeholder, f.helperText])
      .filter((t): t is string => Boolean(t))
      .join(' ');
    expect(texts).not.toMatch(/\brecibió\b|\bintrodúzcalo\b|\bverifique\b/i);
  });
});
