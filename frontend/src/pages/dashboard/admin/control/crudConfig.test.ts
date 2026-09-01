import { describe, expect, it, vi } from 'vitest';
import { serviceAdapter, validateControlForm, mapResponseToForm } from './crudConfig';
import { controlService } from '@/entities/control/api/control.service';

describe('crudConfig & serviceAdapter', () => {
  it('preserves prototype methods from controlService on serviceAdapter', () => {
    expect(typeof serviceAdapter.getAll).toBe('function');
    expect(typeof serviceAdapter.getPaginated).toBe('function');
    expect(typeof serviceAdapter.getById).toBe('function');
    expect(typeof serviceAdapter.delete).toBe('function');
    expect(typeof serviceAdapter.create).toBe('function');
    expect(typeof serviceAdapter.update).toBe('function');
  });

  it('filters undefined fields on create and update', async () => {
    const createSpy = vi.spyOn(controlService, 'create').mockResolvedValue({ id: 101 } as any);
    const updateSpy = vi.spyOn(controlService, 'update').mockResolvedValue({ id: 101 } as any);

    await serviceAdapter.create({
      animal_id: 5,
      checkup_date: '2026-08-31',
      weight: 350,
      height: undefined,
      description: undefined,
      health_status: 'Bueno',
    });

    expect(createSpy).toHaveBeenCalledWith({
      animal_id: 5,
      checkup_date: '2026-08-31',
      weight: 350,
      health_status: 'Bueno',
    });

    await serviceAdapter.update(101, {
      animal_id: 5,
      checkup_date: '2026-08-31',
      weight: undefined,
      height: 140,
      description: 'Revisión periódica',
      health_status: 'Excelente',
    });

    expect(updateSpy).toHaveBeenCalledWith(101, {
      animal_id: 5,
      checkup_date: '2026-08-31',
      height: 140,
      description: 'Revisión periódica',
      health_status: 'Excelente',
    });

    createSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it('validates control form fields correctly', () => {
    expect(
      validateControlForm({
        animal_id: 0,
        checkup_date: '2026-08-31',
      })
    ).toBe('⚠️ Debe seleccionar un animal válido.');

    expect(
      validateControlForm({
        animal_id: 10,
        checkup_date: '',
      })
    ).toBe('La fecha de chequeo es obligatoria.');

    expect(
      validateControlForm({
        animal_id: 10,
        checkup_date: '2026-08-31',
        weight: -5,
      })
    ).toBe('El peso no puede ser negativo.');

    expect(
      validateControlForm({
        animal_id: 10,
        checkup_date: '2026-08-31',
        height: -10,
      })
    ).toBe('La altura no puede ser negativa.');

    expect(
      validateControlForm({
        animal_id: 10,
        checkup_date: '2026-08-31',
        weight: 420,
        height: 138,
        health_status: 'Bueno',
      })
    ).toBeNull();
  });

  it('maps backend response to form object', () => {
    const rawResponse = {
      id: 42,
      animal_id: 7,
      checkup_date: '2026-08-30',
      weight: 380,
      height: 135,
      health_status: 'Excelente',
      description: 'Todo en orden',
      finca_id: 1,
      created_at: '2026-08-30T10:00:00Z',
    };

    const form = mapResponseToForm(rawResponse as any);
    expect(form).toEqual({
      animal_id: 7,
      checkup_date: '2026-08-30',
      weight: 380,
      height: 135,
      health_status: 'Excelente',
      description: 'Todo en orden',
    });
  });
});
