import { describe, expect, it } from 'vitest';
import { fincaFormDefaults, fincasConfig } from './FincasAdminPage';

describe('FincasAdminPage contract', () => {
  it('uses the real Finca API fields and includes every required field', () => {
    const columnKeys = fincasConfig.columns.map((column) => column.key);
    const fieldNames = fincasConfig.formSections
      ?.flatMap((section) => section.fields)
      .map((field) => field.name);

    expect(columnKeys).toEqual(expect.arrayContaining([
      'id',
      'name',
      'type',
      'department',
      'municipality',
      'is_active',
    ]));
    expect(columnKeys).not.toEqual(expect.arrayContaining(['location', 'size_ha', 'status']));
    expect(fieldNames).toEqual(expect.arrayContaining(['name', 'type']));
    expect(fincaFormDefaults).toMatchObject({
      name: '',
      type: 'Tradicional',
      is_active: true,
    });
  });
});
