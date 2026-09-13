export const LEARNING_CACHE_NAME = 'documents';

function canUseCacheStorage(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined';
}

export async function isLearningMaterialCached(localUri?: string | null): Promise<boolean> {
  if (!localUri || !canUseCacheStorage()) return false;

  try {
    const cache = await caches.open(LEARNING_CACHE_NAME);
    return Boolean(await cache.match(localUri));
  } catch {
    return false;
  }
}

export async function cacheLearningMaterial(localUri?: string | null): Promise<boolean> {
  if (!localUri || !canUseCacheStorage()) return false;

  try {
    const cache = await caches.open(LEARNING_CACHE_NAME);
    if (await cache.match(localUri)) return true;

    const response = await fetch(localUri, { credentials: 'include' });
    if (!response.ok && response.type !== 'opaque') return false;

    await cache.put(localUri, response.clone());
    return Boolean(await cache.match(localUri));
  } catch {
    return false;
  }
}
