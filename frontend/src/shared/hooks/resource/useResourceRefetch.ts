import { useCallback } from 'react';
import type { BaseService } from '@/shared/api/base-service';
import { UseResourceResult } from './types';

// Global registries
export const __resourceRefetchers = new Set<() => Promise<any>>();
export const __resourceInflight = new Map<string, Promise<any>>();
export const __resourceLastFetchAt = new Map<string, number>();
export const __endpointBackoffUntil = new Map<string, number>();

if (typeof window !== 'undefined') {
  (window as any).__resourceRefetchers = __resourceRefetchers;
  (window as any).__resourceInflight = __resourceInflight;
  (window as any).__resourceLastFetchAt = __resourceLastFetchAt;
  (window as any).__endpointBackoffUntil = __endpointBackoffUntil;
}

export async function refetchAllResources(): Promise<void> {
  const fns = Array.from(__resourceRefetchers);
  await Promise.allSettled(
    fns.map((fn) => {
      try { return fn(); } catch { return Promise.resolve(); }
    })
  );
}

export function registerResourceRefetch(fn: () => Promise<any>): () => void {
  __resourceRefetchers.add(fn);
  return () => {
    __resourceRefetchers.delete(fn);
  };
}

function buildPaginatedResponse<T>(items: T[], params?: Record<string, any>) {
  const limit = Number(params?.limit ?? items.length ?? 10);
  const page = Number(params?.page ?? 1);
  return {
    data: items,
    total: items.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(items.length / Math.max(1, limit))),
    hasNextPage: false,
    hasPreviousPage: page > 1,
    rawMeta: { page_size: limit, totalPages: Math.max(1, Math.ceil(items.length / Math.max(1, limit))) }
  };
}

async function fetchServicePage<T>(service: BaseService<T>, params?: Record<string, any>) {
  const paginatedFn = (service as any)?.getPaginated;
  if (typeof paginatedFn === 'function') {
    return paginatedFn.call(service, params);
  }
  const allFn = (service as any)?.getAll;
  if (typeof allFn === 'function') {
    const items = await allFn.call(service, params);
    return buildPaginatedResponse<T>(Array.isArray(items) ? items : [], params);
  }
  throw new Error(`El servicio ${String((service as any)?.endpoint || service.constructor?.name || 'desconocido')} no expone getPaginated ni getAll`);
}

export function useResourceRefetch<T extends { id?: number | string }, P extends Record<string, any>>(
  service: BaseService<T>,
  data: T[],
  setData: React.Dispatch<React.SetStateAction<T[]>>,
  setMeta: React.Dispatch<React.SetStateAction<UseResourceResult<T, P>["meta"]>>,
  setRefreshing: React.Dispatch<React.SetStateAction<boolean>>,
  safeExecute: <R>(fn: (signal: AbortSignal) => Promise<R>) => Promise<R | undefined>,
  buildEffectiveParams: () => Record<string, any> | undefined,
  prefix: string,
  generateKey: (prefix: string, params: any) => string,
  getCache: (key: string) => any,
  setCache: (key: string, data: any, ttl: number) => void,
  cacheTTL: number | undefined,
  cache: boolean,
  map: (<R>(items: R[]) => R[]) | undefined,
  lastParamsRef: React.MutableRefObject<P | undefined>,
  abortControllerRef: React.MutableRefObject<AbortController>,
  skipCacheUntilRef: React.MutableRefObject<number>,
  tracker: {
    recentlyCreatedIds: React.MutableRefObject<Set<string>>;
    recentlyCreatedItems: React.MutableRefObject<Map<string, T>>;
    recentlyDeletedIds: React.MutableRefObject<Set<string>>;
    applyStableOrder: (list: T[], currentData: T[]) => T[];
  }
) {
  const { recentlyCreatedIds, recentlyCreatedItems, recentlyDeletedIds, applyStableOrder } = tracker;

  const refetch = useCallback(async (params?: P): Promise<T[]> => {
    lastParamsRef.current = params || lastParamsRef.current;
    const effective = buildEffectiveParams();
    const cacheKey = generateKey(prefix, effective);
    const nowTs = Date.now();
    const lastTs = __resourceLastFetchAt.get(cacheKey) || 0;
    const backoffUntil = __endpointBackoffUntil.get(prefix) || 0;

    if (backoffUntil && nowTs < backoffUntil) return data;
    if (nowTs - lastTs < 1500) return data;

    try { abortControllerRef.current.abort('Refetching: cancel previous request'); } catch { /* noop */ }
    abortControllerRef.current = new AbortController();
    const effectiveWithToken = { ...(effective || {}), signal: abortControllerRef.current.signal } as any;

    __resourceLastFetchAt.set(cacheKey, nowTs);

    const hasData = Array.isArray(data) && data.length > 0;
    if (hasData) setRefreshing(true);

    try {
      const now = Date.now();
      const shouldSkipCache = now < skipCacheUntilRef.current;
      const shouldUseCache = cache && !shouldSkipCache;
      if (shouldSkipCache) effectiveWithToken.cache_bust = Date.now();

      if (shouldUseCache) {
        const cached = getCache(cacheKey);
        if (cached && cached.timestamp) {
          const items = (cached.items || cached.data || []) as T[];
          const finalList = map ? map(items) : items;
          setData(finalList);
          if (cached.meta) {
            setMeta({
              page: Number(cached.meta.page ?? effective?.page ?? 1),
              limit: Number(cached.meta.limit ?? effective?.limit ?? finalList.length ?? 10),
              total: Number(cached.meta.total ?? finalList.length ?? 0),
              totalPages: cached.meta.totalPages,
              hasNextPage: cached.meta.hasNextPage,
              hasPreviousPage: cached.meta.hasPreviousPage,
              rawMeta: cached.meta.rawMeta,
            });
          } else {
            setMeta(null);
          }

          const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
          if (isOnline && !__resourceInflight.has(cacheKey)) {
            const bgParams = { ...effectiveWithToken, cache_bust: Date.now() };
            const bgPromise = safeExecute(async (signal) => {
              const bgWithSignal = { ...bgParams, signal };
              const hasPaging = effective && (effective.page !== undefined || effective.limit !== undefined);
              if (hasPaging) {
                const resp: any = await fetchServicePage(service, bgWithSignal);
                const items: T[] = (resp?.data ?? resp) as T[];
                const serverList = map ? map(items) : items;

                const serverIds = new Set(serverList.map(item => String((item as any)?.id)));
                const missingRecentItems: T[] = [];
                for (const recentId of Array.from(recentlyCreatedIds.current)) {
                  if (!serverIds.has(recentId)) {
                    let localItem = recentlyCreatedItems.current.get(recentId);
                    if (!localItem) localItem = data.find(item => String((item as any)?.id) === recentId);
                    if (localItem) missingRecentItems.push(localItem as T);
                  }
                }
                let mergedList = missingRecentItems.length > 0 ? [...missingRecentItems, ...serverList] : serverList;
                const effectiveLimit = Number(resp?.limit ?? effectiveWithToken?.limit);
                if (missingRecentItems.length > 0 && effectiveLimit && mergedList.length > effectiveLimit) {
                  mergedList = mergedList.slice(0, effectiveLimit);
                }
                if (recentlyDeletedIds.current.size > 0) {
                  mergedList = mergedList.filter(item => !recentlyDeletedIds.current.has(String((item as any)?.id)));
                }

                setData(applyStableOrder(mergedList, data));
                setMeta({
                  page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                  limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
                  total: Number(resp?.total ?? mergedList.length ?? 0),
                  totalPages: resp?.totalPages,
                  hasNextPage: resp?.hasNextPage,
                  hasPreviousPage: resp?.hasPreviousPage,
                  rawMeta: resp?.rawMeta,
                });
                setCache(cacheKey, {
                  items: mergedList,
                  meta: {
                    page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                    limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
                    total: Number(resp?.total ?? mergedList.length ?? 0),
                    totalPages: resp?.totalPages,
                    hasNextPage: resp?.hasNextPage,
                    hasPreviousPage: resp?.hasPreviousPage,
                    rawMeta: resp?.rawMeta,
                  },
                  timestamp: Date.now(),
                  includesLocalRecent: missingRecentItems.length > 0,
                  recentIds: Array.from(recentlyCreatedIds.current)
                }, cacheTTL ?? 0);
              } else {
                const list = await service.getAll(bgWithSignal);
                const serverList = map ? map(list) : list;
                
                const serverIds = new Set(serverList.map(item => String((item as any)?.id)));
                const missingRecentItems: T[] = [];
                for (const recentId of Array.from(recentlyCreatedIds.current)) {
                  if (!serverIds.has(recentId)) {
                    let localItem = recentlyCreatedItems.current.get(recentId);
                    if (!localItem) localItem = data.find(item => String((item as any)?.id) === recentId);
                    if (localItem) missingRecentItems.push(localItem as T);
                  }
                }
                const mergedList = missingRecentItems.length > 0 ? [...missingRecentItems, ...serverList] : serverList;
                setData(applyStableOrder(mergedList, data));
                setMeta(null);
                setCache(cacheKey, { data: mergedList, timestamp: Date.now(), includesLocalRecent: missingRecentItems.length > 0, recentIds: Array.from(recentlyCreatedIds.current) }, cacheTTL ?? 0);
              }
            });
            __resourceInflight.set(cacheKey, bgPromise as Promise<any>);
            void bgPromise.finally(() => { __resourceInflight.delete(cacheKey); }).catch(() => {});
          }
          return finalList;
        }
      }

      let fetchPromise = __resourceInflight.get(cacheKey);
      if (!fetchPromise) {
        fetchPromise = safeExecute(async (signal) => {
          const effectiveWithSignal = { ...effectiveWithToken, signal };
          const hasPaging = effective && (effective.page !== undefined || effective.limit !== undefined);
          if (hasPaging) {
            const resp: any = await fetchServicePage(service, effectiveWithSignal);
            const items: T[] = (resp?.data ?? resp) as T[];
            const serverList = map ? map(items) : items;

            const serverIds = new Set(serverList.map(item => String((item as any)?.id)));
            const missingRecentItems: T[] = [];
            for (const recentId of Array.from(recentlyCreatedIds.current)) {
              if (!serverIds.has(recentId)) {
                let localItem = recentlyCreatedItems.current.get(recentId);
                if (!localItem) localItem = data.find(item => String((item as any)?.id) === recentId);
                if (localItem) missingRecentItems.push(localItem as T);
              }
            }

            let mergedList = missingRecentItems.length > 0 ? [...missingRecentItems, ...serverList] : serverList;
            const effectiveLimit = Number(resp?.limit ?? effectiveWithToken?.limit);
            if (missingRecentItems.length > 0 && effectiveLimit && mergedList.length > effectiveLimit) {
              mergedList = mergedList.slice(0, effectiveLimit);
            }
            if (recentlyDeletedIds.current.size > 0) {
              mergedList = mergedList.filter(item => !recentlyDeletedIds.current.has(String((item as any)?.id)));
            }

            setData(applyStableOrder(mergedList, data));
            setMeta({
              page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
              limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? mergedList.length ?? 10),
              total: Number(resp?.total ?? mergedList.length ?? 0),
              totalPages: resp?.totalPages,
              hasNextPage: resp?.hasNextPage,
              hasPreviousPage: resp?.hasPreviousPage,
              rawMeta: resp?.rawMeta,
            });

            if (cache) {
              setCache(cacheKey, {
                items: serverList,
                meta: {
                  page: Number(resp?.page ?? effectiveWithToken?.page ?? 1),
                  limit: Number(resp?.limit ?? effectiveWithToken?.limit ?? serverList.length ?? 10),
                  total: Number(resp?.total ?? serverList.length ?? 0),
                  totalPages: resp?.totalPages,
                  hasNextPage: resp?.hasNextPage,
                  hasPreviousPage: resp?.hasPreviousPage,
                  rawMeta: resp?.rawMeta,
                },
                timestamp: Date.now()
              }, cacheTTL ?? 0);
            }
            return mergedList;
          }

          const list = await service.getAll(effectiveWithSignal);
          const serverList = map ? map(list) : list;
          
          const serverIds = new Set(serverList.map(item => String((item as any)?.id)));
          const missingRecentItems: T[] = [];
          for (const recentId of Array.from(recentlyCreatedIds.current)) {
            if (!serverIds.has(recentId)) {
              let localItem = recentlyCreatedItems.current.get(recentId);
              if (!localItem) localItem = data.find(item => String((item as any)?.id) === recentId);
              if (localItem) missingRecentItems.push(localItem as T);
            }
          }
          let mergedList = missingRecentItems.length > 0 ? [...missingRecentItems, ...serverList] : serverList;
          if (recentlyDeletedIds.current.size > 0) {
            mergedList = mergedList.filter(item => !recentlyDeletedIds.current.has(String((item as any)?.id)));
          }

          setData(applyStableOrder(mergedList, data));
          setMeta(null);
          if (cache) setCache(cacheKey, { data: serverList, timestamp: Date.now() }, cacheTTL ?? 0);
          return mergedList;
        });
        __resourceInflight.set(cacheKey, fetchPromise as Promise<any>);
      }
      
      try {
        const result = await fetchPromise;
        return result === undefined ? data : result;
      } finally {
        __resourceInflight.delete(cacheKey);
      }
    } finally {
      if (hasData) setRefreshing(false);
    }
  }, [buildEffectiveParams, cache, cacheTTL, data, generateKey, getCache, map, prefix, safeExecute, service, setCache, lastParamsRef, abortControllerRef, skipCacheUntilRef, recentlyCreatedIds, recentlyCreatedItems, recentlyDeletedIds, applyStableOrder]);

  return { refetch };
}

