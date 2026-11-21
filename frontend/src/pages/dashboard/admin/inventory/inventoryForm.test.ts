import { describe, expect, it } from 'vitest';
import { getTodayColombia } from '@/shared/utils/dateUtils';
import { initialInventoryFormData, inventoryFormSections } from './inventoryForm';

describe('inventoryForm', () => {
  it('inicializa expiry_date con fecha de Colombia sin bloquear fechas futuras de vencimiento', () => {
    expect(initialInventoryFormData.expiry_date).toBe(getTodayColombia());

    const expiryField = inventoryFormSections
      .flatMap((section) => section.fields)
      .find((field) => field.name === 'expiry_date');
    expect(expiryField).toBeDefined();
    expect(expiryField?.maxDate).toBeUndefined();
  });
});
