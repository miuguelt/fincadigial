import { describe, expect, it } from 'vitest';
import { fincaFormDefaults, fincasConfig } from './FincasAdminPage';
import { fincaFormDefaults as extractedFincaFormDefaults } from './fincaFormDefaults';
import { fincasConfig as extractedFincasConfig } from './fincasConfig';
import { fincasAdminService } from './fincasService';

describe('FincasAdminPage contract', () => {
  it('mantiene la configuración y el servicio en seams dedicados', () => {
    expect(fincasConfig).toBe(extractedFincasConfig);
    expect(fincaFormDefaults).toBe(extractedFincaFormDefaults);
    expect(fincasAdminService).toBeDefined();
  });

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
      'public_visibility',
      'is_active',
    ]));
    expect(columnKeys).not.toEqual(expect.arrayContaining(['location', 'size_ha', 'status']));
    expect(fieldNames).toEqual(expect.arrayContaining(['name', 'type', 'public_visibility']));
    expect(fincaFormDefaults).toMatchObject({
      name: '',
      type: 'Tradicional',
      public_visibility: 'minimal',
      is_active: true,
    });
  });

  it('includes proper options for privacy and visibility policy', () => {
    const visibilityField = fincasConfig.formSections
      ?.flatMap((section) => section.fields)
      .find((field) => field.name === 'public_visibility');

    expect(visibilityField).toBeDefined();
    expect(visibilityField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: 'minimal' }),
        expect.objectContaining({ value: 'standard' }),
        expect.objectContaining({ value: 'full' }),
      ])
    );
  });

  it('uses the finca name as the profile modal title', () => {
    expect(typeof fincasConfig.detailTitle).toBe('function');
    expect((fincasConfig.detailTitle as (item: { name: string }) => string)({ name: 'Finca El Roble' }))
      .toBe('Ficha de Finca El Roble');
  });
});
