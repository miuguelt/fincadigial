import {
  getIndexedDBCache,
  invalidateIndexedDBCacheByPrefix,
  setIndexedDBCache,
} from '@/shared/api/cache/indexedDBCache';
import { clearAllServiceCaches } from '@/shared/api/service-registry';
import { HTTP_CACHE_TTL, IDB_READ_ONLINE, IDB_READ_TIMEOUT_MS } from './settings';

/**
 * Caché dual de respuestas GET: memoria (rápida) más IndexedDB (persistente
 * entre sesiones, imprescindible cuando la finca se queda sin cobertura).
 */
type CacheEntry = { data: any; expiry: number; etag?: string; lastModified?: string };

const memoryCache = new Map<string, CacheEntry>();

/** GET en vuelo, compartidos para no repetir la misma consulta simultánea. */
export const inflightGet = new Map<string, Promise<any>>();

let httpCacheGeneration = 0;

/** Generación actual: cambia con cada escritura confirmada. */
export const getCacheGeneration = (): number => httpCacheGeneration;

export const readMemoryCache = (key: string): CacheEntry | undefined => memoryCache.get(`http-cache:${key}`);

/** Invalida las respuestas GET guardadas después de una escritura confirmada. */
export async function invalidateHttpCache(): Promise<void> {
  httpCacheGeneration += 1;
  memoryCache.clear();
  inflightGet.clear();
  await Promise.all([
    invalidateIndexedDBCacheByPrefix('http-cache:'),
    clearAllServiceCaches(),
  ]);
}

type CacheReadOptions = {
  allowIdb?: boolean;
  timeoutMs?: number;
};

const IDB_READ_TIMEOUT_SENTINEL = Symbol('IDB_READ_TIMEOUT');

/** Lee del cache (memoria primero, luego IndexedDB). */
export async function readCache(key: string, options?: CacheReadOptions): Promise<any | null> {
  const cacheKey = `http-cache:${key}`;

  // 1. Intentar memoria primero (ultra rápido)
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() <= memEntry.expiry) {
    return memEntry.data;
  }

  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  const allowIdb = options?.allowIdb ?? (isOnline ? IDB_READ_ONLINE : true);
  if (!allowIdb) {
    return null;
  }

  const timeoutMs = options?.timeoutMs ?? IDB_READ_TIMEOUT_MS;

  // 2. Fallback a IndexedDB (persistente entre sesiones)
  try {
    const idbPromise = getIndexedDBCache<any>(cacheKey, {
      allowStaleWhenOffline: true,
      offlineGraceMs: 60 * 24 * 60 * 60 * 1000, // hasta 60 días en modo offline prolongado (semanas sin internet)
    });

    const readWithTimeout = timeoutMs > 0
      ? Promise.race([
        idbPromise,
        new Promise<symbol>((resolve) => setTimeout(() => resolve(IDB_READ_TIMEOUT_SENTINEL), timeoutMs)),
      ])
      : idbPromise;

    const idbResult = await readWithTimeout;

    if (idbResult === IDB_READ_TIMEOUT_SENTINEL) {
      // No bloquear la request; hidratar memoria si el IDB termina luego
      void idbPromise.then((data) => {
        if (!data) return;
        memoryCache.set(cacheKey, {
          data,
          expiry: Date.now() + HTTP_CACHE_TTL,
        });
      }).catch(() => { /* noop */ });
      return null;
    }

    if (idbResult) {
      // Hidratar memoria con dato de IndexedDB
      memoryCache.set(cacheKey, {
        data: idbResult,
        expiry: Date.now() + HTTP_CACHE_TTL,
      });
      return idbResult;
    }
  } catch (error) {
    console.warn('[api] Error leyendo cache IndexedDB:', error);
  }

  return null;
}

/** Escribe en cache (memoria + IndexedDB). */
export function writeCache(
  key: string,
  data: any,
  ttlMs: number = HTTP_CACHE_TTL,
  meta?: { etag?: string; lastModified?: string }
): void {
  const cacheKey = `http-cache:${key}`;
  const expiry = Date.now() + Math.max(1000, ttlMs);

  // 1. Escribir en memoria (sincrónico, rápido)
  memoryCache.set(cacheKey, { data, expiry, etag: meta?.etag, lastModified: meta?.lastModified });

  // 2. Escribir en IndexedDB (asíncrono, persistente) en background
  void setIndexedDBCache(cacheKey, data, ttlMs).catch(err => {
    console.warn('[api] Error escribiendo cache IndexedDB:', err);
  });
}
