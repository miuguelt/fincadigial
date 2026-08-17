import { useCallback } from 'react';
import type { BaseService } from '@/shared/api/base-service';
import {
  __endpointBackoffUntil,
  __resourceInflight,
  __resourceLastFetchAt,
} from './resourceRegistry';
import { buildMeta, capToPageLimit, filterDeleted, mergeRecentItems } from './resourceMerge';
import type { UseResourceResult } from './types';

// Se reexportan porque las pruebas de integracion limpian estos registros entre
// casos. Deben ser los mismos objetos que usa el hook, no una copia.
export { __endpointBackoffUntil, __resourceInflight, __resourceLastFetchAt } from './resourceRegistry';

/** Una busqueda que tarda 1,5 s en salir se siente rota; el resto puede esperar. */
const SEARCH_THROTTLE_MS = 500;
const DEFAULT_THROTTLE_MS = 1500;

interface RefetchDeps<T, P extends Record<string, any>> {
  service: BaseService<T>;
  data: T[];
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  setMeta: React.Dispatch<React.SetStateAction<UseResourceResult<T, P>['meta']>>;
  setRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
  safeExecute: <R>(fn: () => Promise<R>) => Promise<R | undefined>;
  buildEffectiveParams: () => Record<string, any> | undefined;
  prefix: string;
  generateKey: (prefix: string, params: any) => string;
  getCache: <R>(key: string) => R | null | undefined;
  setCache: (key: string, data: any, ttl?: number) => void;
  cacheTTL: number | undefined;
  cache: boolean;
  map: (<R>(items: R[]) => R[]) | undefined;
  searchQP: string | undefined;
  lastParamsRef: React.MutableRefObject<P | undefined>;
  cancelSourceRef: React.MutableRefObject<any>;
  skipCacheUntilRef: React.MutableRefObject<number>;
  tracker: {
    recentlyCreatedIds: React.MutableRefObject<Set<string>>;
    recentlyCreatedItems: React.MutableRefObject<Map<string, T>>;
    recentlyDeletedIds: React.MutableRefObject<Set<string>>;
    applyStableOrder: (list: T[], currentData: T[]) => T[];
  };
  createCancelSource: () => any;
}

/**
 * Trae la lista y la deja consistente con lo que el usuario ya ve.
 *
 * El orden importa: caché persistente primero para pintar rápido, luego un
 * refresco en segundo plano deduplicado por clave, y siempre reconciliando
 * contra los items creados o eliminados hace poco.
 */
export function useResourceRefetch<T extends { id?: number | string }, P extends Record<string, any>>(
  deps: RefetchDeps<T, P>
) {
  const {
    service, data, setData, setMeta, setRefreshing, safeExecute, buildEffectiveParams,
    prefix, generateKey, getCache, setCache, cacheTTL, cache, map, searchQP,
    lastParamsRef, cancelSourceRef, skipCacheUntilRef, tracker, createCancelSource,
  } = deps;

  const { recentlyCreatedIds, recentlyCreatedItems, recentlyDeletedIds, applyStableOrder } = tracker;

  const reconcile = useCallback(
    (serverList: T[], respLimit: unknown, paramLimit: unknown) => {
      const { merged, missing } = mergeRecentItems<T>({
        serverList,
        currentData: data,
        recentlyCreatedIds: recentlyCreatedIds.current,
        recentlyCreatedItems: recentlyCreatedItems.current,
      });
      const capped = capToPageLimit(merged, missing.length, Number(respLimit ?? paramLimit) || undefined);
      return filterDeleted(capped, recentlyDeletedIds.current);
    },
    [data, recentlyCreatedIds, recentlyCreatedItems, recentlyDeletedIds]
  );

  const refetch = useCallback(async (params?: P): Promise<T[]> => {
    lastParamsRef.current = params || lastParamsRef.current;
    const effective = buildEffectiveParams();
    const cacheKey = generateKey(prefix, effective);
    const nowTs = Date.now();

    const backoffUntil = __endpointBackoffUntil.get(prefix) || 0;
    if (backoffUntil && nowTs < backoffUntil) return data;

    const throttleMs = searchQP ? SEARCH_THROTTLE_MS : DEFAULT_THROTTLE_MS;
    if (nowTs - (__resourceLastFetchAt.get(cacheKey) || 0) < throttleMs) return data;

    try { cancelSourceRef.current.cancel('Refetching: cancel previous request'); } catch { /* noop */ }
    cancelSourceRef.current = createCancelSource();
    const requestParams = { ...(effective || {}), cancelToken: cancelSourceRef.current.token } as any;

    __resourceLastFetchAt.set(cacheKey, nowTs);

    const hasData = Array.isArray(data) && data.length > 0;
    if (hasData) setRefreshing(true);

    const hasPaging = Boolean(effective && (effective.page !== undefined || effective.limit !== undefined));
    const supportsPaging = hasPaging && typeof (service as any).getPaginated === 'function';

    /** Trae del servidor y deja estado + caché consistentes. Devuelve la lista mostrada. */
    const fetchAndApply = async (callParams: any): Promise<T[]> => {
      if (supportsPaging) {
        const resp: any = await (service as any).getPaginated(callParams);
        const items: T[] = (resp?.data ?? resp) as T[];
        const serverList = map ? map(items) : items;
        const mergedList = reconcile(serverList, resp?.limit, callParams?.limit);

        setData(applyStableOrder(mergedList, data));
        setMeta(buildMeta(resp, callParams, mergedList));

        if (cache) {
          setCache(
            cacheKey,
            { items: serverList, meta: buildMeta(resp, callParams, serverList), timestamp: Date.now() },
            cacheTTL
          );
        }
        return mergedList;
      }

      const list = await service.getAll(callParams);
      const serverList = map ? map(list) : list;
      const mergedList = reconcile(serverList, undefined, undefined);

      setData(applyStableOrder(mergedList, data));
      setMeta(null);
      if (cache) setCache(cacheKey, { data: serverList, timestamp: Date.now() }, cacheTTL);
      return mergedList;
    };

    try {
      const shouldSkipCache = Date.now() < skipCacheUntilRef.current;
      if (shouldSkipCache) requestParams.cache_bust = Date.now();

      if (cache && !shouldSkipCache) {
        const cached = getCache<{ items?: T[]; data?: T[]; meta?: any; timestamp?: number }>(cacheKey);
        if (cached && cached.timestamp) {
          const items = (cached.items || cached.data || []) as T[];
          const finalList = map ? map(items) : items;
          setData(finalList);
          setMeta(cached.meta ? buildMeta(cached.meta, effective, finalList) : null);

          // Revalidar en segundo plano sin bloquear la interfaz.
          const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
          if (isOnline && !__resourceInflight.has(cacheKey)) {
            const bgPromise = safeExecute(() => fetchAndApply({ ...requestParams, cache_bust: Date.now() }));
            __resourceInflight.set(cacheKey, bgPromise as Promise<any>);
            void bgPromise.finally(() => { __resourceInflight.delete(cacheKey); }).catch(() => { /* noop */ });
          }
          return finalList;
        }
      }

      let fetchPromise = __resourceInflight.get(cacheKey);
      if (!fetchPromise) {
        fetchPromise = safeExecute(() => fetchAndApply(requestParams));
        __resourceInflight.set(cacheKey, fetchPromise as Promise<any>);
      }

      try {
        const result = await fetchPromise;
        // undefined = petición cancelada: conservar lo que ya se muestra.
        return result === undefined ? data : result;
      } finally {
        __resourceInflight.delete(cacheKey);
      }
    } finally {
      if (hasData) setRefreshing(false);
      // skipCacheUntil no se resetea aquí: expira solo por timestamp.
    }
  }, [
    applyStableOrder, buildEffectiveParams, cache, cacheTTL, data, generateKey,
    getCache, map, prefix, reconcile, safeExecute, searchQP, service, setCache, setData, setMeta,
    setRefreshing, lastParamsRef, cancelSourceRef, skipCacheUntilRef, createCancelSource,
  ]);

  return { refetch };
}
