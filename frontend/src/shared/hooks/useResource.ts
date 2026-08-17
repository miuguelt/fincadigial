import { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { BaseService } from '@/shared/api/base-service';
import { useCache, useCacheKey } from '@/app/providers/CacheContext';
import {
  __endpointBackoffUntil,
  refetchAllResources,
  registerResourceRefetch,
} from './resource/resourceRegistry';
import { useResourceCrud } from './resource/useResourceCrud';
import { useResourceParams } from './resource/useResourceParams';
import { useResourceRealtime } from './resource/useResourceRealtime';
import { useResourceRefetch } from './resource/useResourceRefetch';
import { useResourceTracker } from './resource/useResourceTracker';
import type { UseResourceOptions, UseResourceResult } from './resource/types';

export type { UseResourceOptions, UseResourceResult };
export { refetchAllResources };

/** Espera por defecto cuando el servidor no dice cuánto esperar. */
const DEFAULT_BACKOFF_MS = 30000;

/**
 * Hook genérico para consumir cualquier BaseService<T>: lista, paginación,
 * CRUD optimista, caché y tiempo real.
 *
 * Este archivo solo ensambla. Cada pieza vive en ./resource: parámetros de URL,
 * refetch con caché, mutaciones, seguimiento de items recientes y realtime.
 */
export function useResource<
  T extends { id?: number | string },
  P extends Record<string, any> = Record<string, any>
>(service: BaseService<T>, options: UseResourceOptions<P> = {}): UseResourceResult<T, P> {
  const { autoFetch = true, initialParams, deps = [], map, cache = true, cacheTTL, cacheKeyPrefix } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<UseResourceResult<T, P>['meta']>(null);
  const [refreshing, setRefreshing] = useState(false);

  const lastParams = useRef<P | undefined>(initialParams);
  const cancelSource = useRef(axios.CancelToken.source());
  // Timestamp, no booleano: el bypass de caché dura una ventana tras escribir.
  const skipCacheUntil = useRef<number>(0);
  const crudInProgress = useRef<boolean>(false);

  const { getCache, setCache, invalidateByEndpoint } = useCache();
  const { generateKey } = useCacheKey();
  const entityKeyRef = useRef<string>(
    (service as any)?.endpoint || service.constructor?.name || 'resource'
  );
  const prefix = cacheKeyPrefix || entityKeyRef.current;

  const params = useResourceParams<P>(initialParams, lastParams, options.filters);
  const tracker = useResourceTracker<T>();

  const safeExecute = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    try {
      setLoading(true);
      setError(null);
      return await fn();
    } catch (e: any) {
      if (axios.isCancel(e)) return undefined;
      setError(e?.message || 'Error inesperado');
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  // Las mutaciones no tocan `error`: ese estado pinta el ErrorState de la lista,
  // y un fallo al guardar no debe borrar de la pantalla lo que sí se cargó.
  const safeExecuteMutation = useCallback(async <R,>(fn: () => Promise<R>): Promise<R | undefined> => {
    try {
      setLoading(true);
      return await fn();
    } catch (e: any) {
      if (axios.isCancel(e)) return undefined;
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const { refetch } = useResourceRefetch<T, P>({
    service, data, setData, setMeta, setRefreshing, safeExecute,
    buildEffectiveParams: params.buildEffectiveParams,
    prefix, generateKey, getCache, setCache, cacheTTL, cache, map,
    searchQP: params.searchQP,
    lastParamsRef: lastParams,
    cancelSourceRef: cancelSource,
    skipCacheUntilRef: skipCacheUntil,
    tracker,
    createCancelSource: () => axios.CancelToken.source(),
  });

  const { createItem, updateItem, deleteItem } = useResourceCrud<T>({
    service, setData, safeExecuteMutation, invalidateByEndpoint, prefix,
    crudInProgressRef: crudInProgress,
    skipCacheUntilRef: skipCacheUntil,
    refetch,
    tracker,
  });

  useResourceRealtime(options, refetch, crudInProgress, skipCacheUntil, entityKeyRef.current);

  // Fetch inicial y re-disparo por dependencias externas.
  useEffect(() => {
    if (autoFetch) {
      void refetch(initialParams as P | undefined).catch(() => { /* noop */ });
    }
    return () => {
      cancelSource.current.cancel('Unmounted');
      cancelSource.current = axios.CancelToken.source();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch, service, cache, params.pageQP, params.limitQP, params.searchQP, params.fieldsQP, ...deps]);

  // Rate limit del cliente: frenar ese endpoint el tiempo que pida el servidor.
  useEffect(() => {
    const handler = (evt: any) => {
      try {
        const endpointPath = String(evt?.detail?.endpoint || '');
        const parts = endpointPath.split('/').filter(Boolean);
        const slug = parts.length ? parts[parts.length - 1] : endpointPath;
        const waitSeconds = typeof evt?.detail?.waitSeconds === 'number' && evt.detail.waitSeconds > 0
          ? evt.detail.waitSeconds
          : undefined;
        __endpointBackoffUntil.set(slug, Date.now() + (waitSeconds ? waitSeconds * 1000 : DEFAULT_BACKOFF_MS));
      } catch { /* noop */ }
    };
    if (typeof window === 'undefined') return () => {};
    window.addEventListener('rate-limit-exceeded', handler as any);
    return () => window.removeEventListener('rate-limit-exceeded', handler as any);
  }, []);

  // Refetch global al recuperar la red.
  useEffect(() => registerResourceRefetch(() => refetch(undefined as any).catch(() => {})), [refetch]);

  return {
    data, loading, error, refetch, createItem, updateItem, deleteItem, setData, meta,
    setPage: params.setPage,
    setLimit: params.setLimit,
    setSearch: params.setSearch,
    setFields: params.setFields,
    refreshing,
  } as UseResourceResult<T, P>;
}

export default useResource;
