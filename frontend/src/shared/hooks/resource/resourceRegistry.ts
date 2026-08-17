/**
 * Estado compartido por todas las instancias de useResource.
 *
 * Vive en un modulo aparte a proposito: cuando cada variante del hook declaraba
 * sus propios mapas, limpiarlos desde una prueba no afectaba a los que el hook
 * real estaba usando. Un unico modulo garantiza que solo exista un registro.
 */

/** Callbacks de refetch, para resincronizar todo al recuperar la red. */
const __resourceRefetchers = new Set<(options?: ResourceRefetchOptions) => Promise<any>>();

/** Peticiones en vuelo por clave de cache, para no lanzar la misma dos veces. */
export const __resourceInflight = new Map<string, Promise<any>>();

/** Ultimo fetch por clave de cache, base del throttle. */
export const __resourceLastFetchAt = new Map<string, number>();

/** Espera impuesta por endpoint cuando el cliente recibe un rate limit. */
export const __endpointBackoffUntil = new Map<string, number>();

export async function refetchAllResources(options?: ResourceRefetchOptions): Promise<void> {
  const fns = Array.from(__resourceRefetchers);
  await Promise.allSettled(
    fns.map((fn) => {
      try {
        return fn(options);
      } catch {
        return Promise.resolve();
      }
    })
  );
}

export function registerResourceRefetch(
  fn: (options?: ResourceRefetchOptions) => Promise<any>,
): () => void {
  __resourceRefetchers.add(fn);
  return () => {
    __resourceRefetchers.delete(fn);
  };
}
import type { ResourceRefetchOptions } from './types';
