import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BaseService } from './base-service';

vi.mock(import('@/shared/api/cache/indexedDBCache'), async (importOriginal) => ({
  ...(await importOriginal()),
  getIndexedDBCache: vi.fn(async () => null),
  setIndexedDBCache: vi.fn(async () => undefined),
  invalidateIndexedDBCacheByPrefix: vi.fn(async () => undefined),
}));

/**
 * Un traslado cambia el conteo de los potreros y el potrero de cada animal,
 * no solo la tabla animal-fields: sin invalidar esas otras cachés las tarjetas
 * seguían mostrando la ocupación anterior hasta que expiraba el TTL.
 */
describe('BaseService.clearCacheFor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limpia la caché de los servicios instanciados que se le indican', async () => {
    const fields = new BaseService('fields');
    const animals = new BaseService('animals');
    const fieldsSpy = vi.spyOn(fields, 'clearCache');
    const animalsSpy = vi.spyOn(animals, 'clearCache');

    await BaseService.clearCacheFor('fields', 'animals');

    expect(fieldsSpy).toHaveBeenCalledTimes(1);
    expect(animalsSpy).toHaveBeenCalledTimes(1);
  });

  it('no falla con endpoints que nunca se instanciaron', async () => {
    await expect(BaseService.clearCacheFor('endpoint-inexistente')).resolves.toBeUndefined();
  });
});
