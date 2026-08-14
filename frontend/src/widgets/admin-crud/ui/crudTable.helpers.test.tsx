import { describe, expect, it } from 'vitest';
import { buildForeignKeyLabelMap, getCrudItemTitle, mapCrudValue } from './crudTable.helpers';

describe('crudTable.helpers', () => {
  const config = {
    entityName: 'Animal',
    columns: [{ key: 'breed_id', label: 'Raza' }],
    formSections: [{ title: 'Datos', fields: [{ name: 'breed_id', label: 'Raza', type: 'select', options: [{ value: 7, label: 'Cebú' }] }] }],
  } as any;

  it('builds foreign-key labels from select options', () => {
    const labels = buildForeignKeyLabelMap(config);
    expect(labels.breed_id.get('7')).toBe('Cebú');
    expect(mapCrudValue('-', 'breed_id', { breed_id: 7 }, labels)).toBe('Cebú');
  });

  it('resolves card titles using the first column', () => {
    expect(getCrudItemTitle({ id: 10, breed_id: 7 }, config, buildForeignKeyLabelMap(config))).toBe('Cebú');
  });
});
