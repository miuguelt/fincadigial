import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCrudFormState } from './useCrudFormState';

describe('useCrudFormState', () => {
  it('preserves consecutive field changes before React renders', () => {
    const initialFormData = {
      product_type: 'Medicamento',
      medication_id: undefined,
      lot_number: '',
      quantity: 0,
      unit: 'ml',
      expiry_date: '2026-08-15',
    };
    const config = {
      formSections: [
        {
          fields: [
            { name: 'product_type', label: 'Tipo', type: 'select', required: true },
            { name: 'medication_id', label: 'Medicamento', type: 'select', required: true },
            { name: 'lot_number', label: 'Lote', type: 'text', required: true },
          ],
        },
      ],
    } as any;

    const { result } = renderHook(() => useCrudFormState(initialFormData, config));

    act(() => {
      result.current.updateFieldValue({ name: 'medication_id' } as any, 1049);
      result.current.updateFieldValue({ name: 'lot_number' } as any, 'E2E-REGRESSION');
    });

    expect(result.current.formData).toMatchObject({
      product_type: 'Medicamento',
      medication_id: 1049,
      lot_number: 'E2E-REGRESSION',
    });
  });
});
