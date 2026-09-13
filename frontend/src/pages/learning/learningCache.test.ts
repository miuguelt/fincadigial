import { describe, expect, it, vi } from 'vitest';
import { cacheLearningMaterial, isLearningMaterialCached } from './learningCache';

function createCache() {
  const entries = new Map<string, Response>();
  return {
    match: vi.fn(async (url: string) => entries.get(url)),
    put: vi.fn(async (url: string, response: Response) => {
      entries.set(url, response);
    }),
  } as unknown as Cache;
}

describe('caché de materiales de aprendizaje', () => {
  it('detecta un material que ya está guardado', async () => {
    const cache = createCache();
    const url = '/media/guia.pdf';
    await cache.put(url, new Response('contenido'));
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });

    await expect(isLearningMaterialCached(url)).resolves.toBe(true);
  });

  it('descarga, guarda y verifica el material antes de confirmar', async () => {
    const cache = createCache();
    const url = '/media/guia.pdf';
    vi.stubGlobal('caches', { open: vi.fn().mockResolvedValue(cache) });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('contenido')));

    await expect(cacheLearningMaterial(url)).resolves.toBe(true);
    expect(fetch).toHaveBeenCalledWith(url, { credentials: 'include' });
    expect(cache.put).toHaveBeenCalledTimes(1);
    await expect(cache.match(url)).resolves.toBeInstanceOf(Response);
  });

  it('devuelve falso cuando no hay URL o la descarga falla', async () => {
    await expect(cacheLearningMaterial(null)).resolves.toBe(false);
    vi.stubGlobal('caches', { open: vi.fn().mockRejectedValue(new Error('sin caché')) });
    await expect(cacheLearningMaterial('/media/guia.pdf')).resolves.toBe(false);
  });
});
