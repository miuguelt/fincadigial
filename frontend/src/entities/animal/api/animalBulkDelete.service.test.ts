import { describe, expect, it, beforeEach, vi } from 'vitest';

/**
 * El cliente se sustituye por una función simple: con `vi.fn` las promesas
 * rechazadas quedan registradas por vitest y hacen fallar la prueba aunque el
 * servicio sí capture el error.
 */
let respond: (...args: any[]) => Promise<any> = async () => ({});
const calls: any[][] = [];
const post = (...args: any[]) => {
  calls.push(args);
  return respond(...args);
};

vi.mock('@/shared/api/client', () => ({ default: { post: (...args: any[]) => post(...args) } }));

const { bulkDeleteAnimals } = await import('./animalBulkDelete.service');

describe('bulkDeleteAnimals', () => {
  beforeEach(() => {
    calls.length = 0;
    respond = async () => ({});
  });

  it('separa los eliminados de los bloqueados con su motivo', async () => {
    respond = async () => ({
      data: {
        success: true,
        message: '1 animales eliminados. 1 no se pudieron eliminar por dependencias.',
        data: {
          deleted_ids: [1],
          missing_ids: [],
          cascade_total: 4,
          blocked: [
            {
              id: 2,
              label: 'el animal «BOV-002»',
              message: 'No se puede eliminar el animal «BOV-002» porque otros registros dependen de él',
              blocking: [
                {
                  table: 'milk_production',
                  label: 'Producción de leche',
                  count: 6,
                  message: 'Producción de leche: 6 registros',
                },
              ],
            },
          ],
        },
      },
    });

    const result = await bulkDeleteAnimals([1, 2]);

    expect(calls[0]).toEqual(['animals/bulk-delete', { ids: [1, 2] }]);
    expect(result.success).toBe(true);
    expect(result.deletedIds).toEqual([1]);
    expect(result.cascadeTotal).toBe(4);
    expect(result.blocked[0].id).toBe(2);
    expect(result.blocked[0].blocking[0].label).toBe('Producción de leche');
  });

  it('devuelve un fallo legible cuando la petición no llega', async () => {
    respond = async () => {
      throw new Error('Sin conexión');
    };

    const result = await bulkDeleteAnimals([1]);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Sin conexión');
    expect(result.deletedIds).toEqual([]);
  });
});
