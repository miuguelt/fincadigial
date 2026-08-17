import { describe, expect, it } from 'vitest';

import { validateFormSections } from './formValidation';

describe('validateFormSections', () => {
  it('does not validate hidden conditional fields', () => {
    const result = validateFormSections(
      [
        {
          fields: [
            { name: 'product_type', label: 'Tipo', type: 'select', required: true },
            {
              name: 'medication_id',
              label: 'Medicamento',
              type: 'select',
              required: true,
              showIf: (data: any) => data.product_type === 'Medicamento',
            },
            {
              name: 'vaccine_id',
              label: 'Vacuna',
              type: 'select',
              required: true,
              showIf: (data: any) => data.product_type === 'Vacuna',
            },
          ],
        },
      ] as any,
      { product_type: 'Medicamento', medication_id: 1049 },
    );

    expect(result).toEqual({ errors: {}, messages: [] });
  });
});
