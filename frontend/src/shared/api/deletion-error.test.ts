import { describe, expect, it } from 'vitest';

import { parseDeletionError } from './deletion-error';

const BLOQUEO = {
  table: 'milk_production',
  label: 'Producción de leche',
  count: 6,
  resolution: 'block',
  cascade_delete: false,
  message: 'Producción de leche: 6 registros dependen de este dato y no se eliminan automáticamente.',
  samples: [{ id: 12, name: '2024-01-05' }],
};

describe('parseDeletionError', () => {
  it('reconoce el bloqueo por integridad de un ApiFetchError', () => {
    const error = Object.assign(new Error('No se puede eliminar el animal «BOV-004»'), {
      status: 409,
      code: 'REFERENTIAL_INTEGRITY_BLOCKED',
      details: { can_delete: false, blocking: [BLOQUEO] },
    });

    const parsed = parseDeletionError(error, 'Error al eliminar');

    expect(parsed.isIntegrityBlock).toBe(true);
    expect(parsed.message).toContain('BOV-004');
    expect(parsed.blocking).toHaveLength(1);
    expect(parsed.blocking[0]).toMatchObject({ label: 'Producción de leche', count: 6 });
    expect(parsed.blocking[0].samples?.[0].name).toBe('2024-01-05');
  });

  it('reconoce el mismo bloqueo en una respuesta axios', () => {
    const error = {
      response: {
        status: 409,
        data: {
          message: 'No se puede eliminar la raza «Holstein»',
          error: {
            code: 'REFERENTIAL_INTEGRITY_BLOCKED',
            details: { blocking: [{ ...BLOQUEO, table: 'animals', label: 'Animales', count: 3 }] },
          },
        },
      },
    };

    const parsed = parseDeletionError(error, 'Error al eliminar');

    expect(parsed.isIntegrityBlock).toBe(true);
    expect(parsed.blocking[0].label).toBe('Animales');
  });

  it('usa el mensaje de respaldo cuando el error no es de integridad', () => {
    const parsed = parseDeletionError({ status: 500 }, 'Error al eliminar el animal');

    expect(parsed.isIntegrityBlock).toBe(false);
    expect(parsed.message).toBe('Error al eliminar el animal');
    expect(parsed.blocking).toEqual([]);
  });

  it('arma un texto legible con los bloqueos para mostrarlo en el diálogo', () => {
    const error = Object.assign(new Error('No se puede eliminar el animal «BOV-004»'), {
      status: 409,
      code: 'REFERENTIAL_INTEGRITY_BLOCKED',
      details: { blocking: [BLOQUEO] },
    });

    const parsed = parseDeletionError(error, 'Error al eliminar');

    expect(parsed.detail).toContain('Producción de leche');
    expect(parsed.detail).toContain('2024-01-05');
  });
});
