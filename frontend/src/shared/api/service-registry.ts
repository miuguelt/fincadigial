import { invalidateIndexedDBCacheByPrefix } from '@/shared/api/cache/indexedDBCache';
import { getCacheScope } from '@/shared/api/cache-scope';
import { isDevMode } from '@/shared/utils/viteEnv';

/** Servicio capaz de vaciar su propia caché (en memoria y persistida). */
interface CacheableService {
  clearCache: () => Promise<void>;
}

const services = new Map<string, CacheableService>();

/** Registra un servicio para poder invalidar su caché desde fuera. */
export function registerService(endpoint: string, service: CacheableService): void {
  services.set(endpoint, service);
}

/**
 * Invalida la caché de otros recursos que una mutación deja obsoletos.
 *
 * Mover ganado cambia la ocupación de `fields` y el potrero de `animals`, no
 * solo `animal-fields`: sin esto las tarjetas de potrero seguían mostrando el
 * conteo anterior hasta que expiraba el TTL de cinco minutos.
 */
export async function clearServiceCaches(...endpoints: string[]): Promise<void> {
  await Promise.all(
    endpoints.map(async (endpoint) => {
      const service = services.get(endpoint);
      if (service) {
        await service.clearCache();
        return;
      }
      // Servicio aún no instanciado: no tiene caché en memoria, pero la
      // persistida en IndexedDB sí puede traer datos viejos.
      try {
        await invalidateIndexedDBCacheByPrefix(`service:${getCacheScope()}:${endpoint}`);
      } catch (err) {
        if (isDevMode()) console.warn('[service-registry] Error invalidando caché de', endpoint, err);
      }
    }),
  );
}
