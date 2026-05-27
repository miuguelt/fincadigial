import { getIndexedDBCache, setIndexedDBCache, startIndexedDBCacheCleanup } from '@/shared/api/cache/indexedDBCache';
import { API_CONFIG } from './config';

if (typeof window !== 'undefined') {
  startIndexedDBCacheCleanup(300000); // 5 mins
}

const memoryCache = new Map<string, { data: any; expiry: number; etag?: string; lastModified?: string }>();

export type CacheReadOptions = {
  allowIdb?: boolean;
  timeoutMs?: number;
};

const IDB_READ_TIMEOUT_SENTINEL = Symbol('IDB_READ_TIMEOUT');

export async function readCache(key: string, options?: CacheReadOptions): Promise<any | null> {
  const cacheKey = `http-cache:${key}`;

  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() <= memEntry.expiry) {
    return memEntry.data;
  }

  const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
  const allowIdb = options?.allowIdb ?? (isOnline ? API_CONFIG.idbReadOnline : true);
  if (!allowIdb) return null;

  const timeoutMs = options?.timeoutMs ?? API_CONFIG.idbReadTimeoutMs;

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
      void idbPromise.then((data) => {
        if (!data) return;
        memoryCache.set(cacheKey, { data, expiry: Date.now() + API_CONFIG.httpCacheTTL });
      }).catch(() => { /* noop */ });
      return null;
    }

    if (idbResult) {
      memoryCache.set(cacheKey, { data: idbResult, expiry: Date.now() + API_CONFIG.httpCacheTTL });
      return idbResult;
    }
  } catch (error) {
    console.warn('[api] Error leyendo cache IndexedDB:', error);
  }

  return null;
}

export function writeCache(key: string, data: any, ttlMs: number = API_CONFIG.httpCacheTTL, meta?: { etag?: string; lastModified?: string }): void {
  const cacheKey = `http-cache:${key}`;
  const expiry = Date.now() + Math.max(1000, ttlMs);

  memoryCache.set(cacheKey, { data, expiry, etag: meta?.etag, lastModified: meta?.lastModified });

  void setIndexedDBCache(cacheKey, data, ttlMs).catch(err => {
    console.warn('[api] Error escribiendo cache IndexedDB:', err);
  });
}

export function getMemoryCacheMeta(key: string) {
  return memoryCache.get(`http-cache:${key}`);
}

export function clearMemoryCache(): void {
  memoryCache.clear();
}

