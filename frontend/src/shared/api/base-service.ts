import api from './client';
import { PageResult } from '@/shared/types/common.types';
import { extractListFromResponse } from './listExtractor';
import { normalizePagination } from './responseNormalizer';
import type { PaginatedResponse } from '@/shared/api/generated/swaggerTypes';
import { buildListParams } from '@/shared/api/list-params';
import { registerService } from '@/shared/api/service-registry';
import {
  getIndexedDBCache,
  setIndexedDBCache,
  invalidateIndexedDBCacheByPrefix
} from '@/shared/api/cache/indexedDBCache';
import { isDevMode } from '@/shared/utils/viteEnv';
import { offlineQueue } from '@/shared/api/offline/offlineQueue';
import { getCacheScope } from '@/shared/api/cache-scope';

const __DEV__ = isDevMode();

interface ServiceOptions {
  enableCache?: boolean;
  cacheTimeout?: number;
  preferredListKeys?: string[];
  retryAttempts?: number;
  timeout?: number;
  persistCache?: boolean;
}

function isOfflineError(error: any): boolean {
  return !navigator.onLine || error?.code === 'ERR_NETWORK' || error?.status === 0 || error?.message?.includes('Network Error');
}

function is304Error(error: any): boolean {
  return error?.response?.status === 304 || error?.status === 304 || error?.original?.response?.status === 304;
}

// BaseService provides shared CRUD, cache, and offline-queue behavior.
export class BaseService<T> {
  protected endpoint: string;
  protected cache: Map<string, { data: any; timestamp: number }>;
  protected options: ServiceOptions;

  private static readonly OFFLINE_STALE_GRACE_MS = 60 * 24 * 60 * 60 * 1000; // 60 días para reutilizar datos cuando no hay red prolongada (semanas sin internet)

  constructor(endpoint: string, options: ServiceOptions = {}) {
    this.endpoint = endpoint;
    this.options = {
      enableCache: true,
      cacheTimeout: 5 * 60 * 1000, // 5 minutos
      preferredListKeys: [],
      retryAttempts: 3,
      timeout: 30000,
      persistCache: true,
      ...options,
    };
    this.cache = new Map();
    registerService(endpoint, this);
  }

  protected getCacheKey(params?: Record<string, any>): string {
    const sortedParams = params ? JSON.stringify(Object.fromEntries(Object.entries(params).sort())) : '';
    return `${getCacheScope()}:${this.endpoint}:${sortedParams}`;
  }

  protected async getFromCache(key: string): Promise<T | T[] | PageResult<T> | PaginatedResponse<T> | null> {
    if (!this.options.enableCache) return null;

    const memCached = this.cache.get(key);
    if (memCached && (Date.now() - memCached.timestamp < this.options.cacheTimeout!)) {
      return memCached.data;
    }

    try {
      const idbKey = `service:${key}`;
      const idbData = await getIndexedDBCache<any>(idbKey, {
        allowStaleWhenOffline: true,
        offlineGraceMs: BaseService.OFFLINE_STALE_GRACE_MS,
      });
      if (idbData) {
        this.cache.set(key, { data: idbData, timestamp: Date.now() });
        return idbData;
      }
    } catch (error) {
      if (__DEV__) console.warn('[BaseService] Error leyendo cache IndexedDB:', error);
    }
    return null;
  }

  protected setCache(key: string, data: any): void {
    if (!this.options.enableCache) return;
    this.cache.set(key, { data, timestamp: Date.now() });
    const idbKey = `service:${key}`;
    void setIndexedDBCache(idbKey, data, this.options.cacheTimeout).catch(err => {
      if (__DEV__) console.warn('[BaseService] Error escribiendo cache IndexedDB:', err);
    });
  }

  public async clearCache(): Promise<void> {
    this.cache.clear();
    const prefix = `service:${getCacheScope()}:${this.endpoint}`;
    try {
      await invalidateIndexedDBCacheByPrefix(prefix);
    } catch (err) {
      if (__DEV__) console.warn('[BaseService] Error limpando cache IDB:', err);
    }
  }

  async getAll(params?: Record<string, any>): Promise<T[]> {
    const normalizedParams = buildListParams(params || {});
    const { cancelToken, ...restParams } = normalizedParams as any;

    const originalParams = (params || {}) as Record<string, any>;
    const hasExplicitLimit = Object.prototype.hasOwnProperty.call(originalParams, 'limit') || Object.prototype.hasOwnProperty.call(originalParams, 'per_page');
    const hasExplicitPage = Object.prototype.hasOwnProperty.call(originalParams, 'page');

    const sanitizedParams: Record<string, any> = { ...restParams };
    if (!hasExplicitPage) delete sanitizedParams.page;
    if (!hasExplicitLimit) delete sanitizedParams.limit;

    if (hasExplicitLimit && (sanitizedParams.limit == null) && sanitizedParams.per_page != null) {
      sanitizedParams.limit = sanitizedParams.per_page;
    }
    delete sanitizedParams.per_page;
    sanitizedParams.sort_dir = sanitizedParams.sort_dir ?? sanitizedParams.sort_order;
    sanitizedParams.q = sanitizedParams.q ?? sanitizedParams.search;

    delete sanitizedParams.sort_order;

    const requestParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(sanitizedParams)) {
      if (v !== undefined) requestParams[k] = v;
    }
    const shouldBypassCache = Object.prototype.hasOwnProperty.call(requestParams, 'cache_bust') && requestParams.cache_bust != null;
    const cacheKeyParams = { ...sanitizedParams };
    if (Object.prototype.hasOwnProperty.call(cacheKeyParams, 'cache_bust')) {
      delete (cacheKeyParams as any).cache_bust;
    }
    const cacheKey = this.getCacheKey(cacheKeyParams);
    const cached = shouldBypassCache ? null : await this.getFromCache(cacheKey);
    if (cached) return cached as T[];

    try {
      const response = await api.get(this.endpoint, { params: requestParams, cancelToken });
      const data = extractListFromResponse(response, this.options.preferredListKeys);
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const is304 = is304Error(e);
      if ((isOfflineError(e) || is304) && cached) {
        if (__DEV__) console.warn('[GET all] fallback from cache for', this.endpoint, is304 ? '(304)' : '(offline)');
        return cached as T[];
      }
      throw e;
    }
  }

  async getPaginated(params?: Record<string, any>): Promise<PaginatedResponse<T>> {
    const normalizedParams = buildListParams(params || {});
    const { cancelToken, ...normalizedWithoutToken } = normalizedParams as any;
    const requestParamsBase: Record<string, any> = { ...normalizedWithoutToken };
    const shouldBypassCache = Object.prototype.hasOwnProperty.call(requestParamsBase, 'cache_bust') && requestParamsBase.cache_bust != null;
    const cacheKeyParams = { ...normalizedWithoutToken };
    if (Object.prototype.hasOwnProperty.call(cacheKeyParams, 'cache_bust')) {
      delete (cacheKeyParams as any).cache_bust;
    }
    const cacheKey = this.getCacheKey(cacheKeyParams);
    const cached = shouldBypassCache ? null : await this.getFromCache(cacheKey);
    if (cached) return cached as unknown as PaginatedResponse<T>;

    const searchValue = normalizedWithoutToken.q ?? normalizedWithoutToken.search;
    const requestParams: Record<string, any> = {
      ...requestParamsBase,
      limit: normalizedWithoutToken.limit,
      sort_dir: normalizedWithoutToken.sort_dir ?? normalizedWithoutToken.sort_order,
      search: searchValue,
      fields: normalizedWithoutToken.fields,
    };
    delete requestParams.per_page;
    delete requestParams.sort_order;
    delete requestParams.q;

    try {
      const response = await api.get(this.endpoint, { params: requestParams, cancelToken });
      const normalized: PageResult<T> = normalizePagination<T>(response, this.options.preferredListKeys) || {
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        pages: 0,
      };
      const paginated: PaginatedResponse<T> = {
        data: normalized.items,
        total_items: normalized.total,
        page: normalized.page,
        limit: normalized.page_size,
        total_pages: normalized.pages,
        has_next_page: normalized.page < normalized.pages,
        has_previous_page: normalized.page > 1,
        rawMeta: { page_size: normalized.page_size, totalPages: normalized.pages }
      };
      this.setCache(cacheKey, paginated);
      return paginated;
    } catch (e: any) {
      const is304 = is304Error(e);
      if ((isOfflineError(e) || is304) && cached) {
        if (__DEV__) console.warn('[GET paginated] fallback from cache for', this.endpoint, is304 ? '(304)' : '(offline)');
        return cached as unknown as PaginatedResponse<T>;
      }
      throw e;
    }
  }

  async getById(id: number | string, params?: Record<string, any>): Promise<T> {
    const normalizedParams = buildListParams(params || {});
    const { cancelToken, ...normalizedWithoutToken } = normalizedParams as any;
    const requestParams: Record<string, any> = {};
    if (normalizedWithoutToken.fields) requestParams.fields = normalizedWithoutToken.fields;
    if (normalizedWithoutToken.cache_bust != null) requestParams.cache_bust = normalizedWithoutToken.cache_bust;

    const shouldBypassCache = requestParams.cache_bust != null;
    const cacheKeyParams = { id, ...requestParams } as Record<string, any>;
    if (Object.prototype.hasOwnProperty.call(cacheKeyParams, 'cache_bust')) {
      delete cacheKeyParams.cache_bust;
    }
    const cacheKey = this.getCacheKey(cacheKeyParams);
    const cached = shouldBypassCache ? null : await this.getFromCache(cacheKey);
    if (cached) return cached as T;

    try {
      const response = await api.get(`${this.endpoint}/${id}`, { params: requestParams, cancelToken });
      const data = response.data?.data || response.data;
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const is304 = is304Error(e);
      if ((isOfflineError(e) || is304) && cached) {
        if (__DEV__) console.warn('[GET byId] fallback from cache for', this.endpoint, id, is304 ? '(304)' : '(offline)');
        return cached as T;
      }
      throw e;
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const response = await api.post(this.endpoint, data);
      await this.clearCache();
      return response.data?.data || response.data;
    } catch (e: any) {
      if (isOfflineError(e)) {
        if (__DEV__) console.info('[BaseService] Offline detected, enqueuing CREATE for', this.endpoint);
        await offlineQueue.enqueue('POST', this.endpoint, data);
        return { ...data, _is_offline_pending: true } as unknown as T;
      }
      throw e;
    }
  }

  async update(id: number | string, data: Partial<T>): Promise<T> {
    try {
      const response = await api.put(`${this.endpoint}/${id}`, data);
      await this.clearCache();
      return response.data?.data || response.data;
    } catch (e: any) {
      if (isOfflineError(e)) {
        if (__DEV__) console.info('[BaseService] Offline detected, enqueuing UPDATE for', this.endpoint, id);
        await offlineQueue.enqueue('PUT', `${this.endpoint}/${id}`, data);
        return { ...data, id, _is_offline_pending: true } as unknown as T;
      }
      throw e;
    }
  }

  async patch(id: number | string, data: Partial<T>): Promise<T> {
    try {
      const response = await api.patch(`${this.endpoint}/${id}`, data);
      await this.clearCache();
      return response.data?.data || response.data;
    } catch (e: any) {
      if (isOfflineError(e)) {
        if (__DEV__) console.info('[BaseService] Offline detected, enqueuing PATCH for', this.endpoint, id);
        await offlineQueue.enqueue('PATCH', `${this.endpoint}/${id}`, data);
        return { ...data, id, _is_offline_pending: true } as unknown as T;
      }
      throw e;
    }
  }

  async delete(id: number | string, config?: Record<string, any>): Promise<boolean> {
    try {
      const url = `${this.endpoint}/${id}`;
      await (config ? api.delete(url, config) : api.delete(url));
      await this.clearCache();
      return true;
    } catch (e: any) {
      if (isOfflineError(e)) {
        if (__DEV__) console.info('[BaseService] Offline detected, enqueuing DELETE for', this.endpoint, id);
        await offlineQueue.enqueue('DELETE', `${this.endpoint}/${id}`);
        return true; // Pretender éxito para UI, se sincronizará luego
      }
      throw e;
    }
  }

  async search(query: string, params?: Record<string, any>): Promise<T[]> {
    const normalizedParams = buildListParams(params || {});
    const searchValue = normalizedParams.search ?? query;
    const searchParams = { ...normalizedParams, q: searchValue, search: searchValue };
    const cacheKey = this.getCacheKey(searchParams);
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached as T[];

    try {
      const response = await api.get(`${this.endpoint}/search`, { params: searchParams });
      const data = extractListFromResponse(response, this.options.preferredListKeys);
      this.setCache(cacheKey, data);
      return data;
    } catch (e: any) {
      const is304 = is304Error(e);
      if ((isOfflineError(e) || is304) && cached) {
        if (__DEV__) console.warn('[SEARCH] fallback from cache for', this.endpoint, is304 ? '(304)' : '(offline)');
        return cached as T[];
      }
      throw e;
    }
  }

  async customRequest<R>(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH', payload: any = null, config: any = {}): Promise<R> {
    const url = `${this.endpoint}/${path}`;
    const response = await api.request({
      url,
      method,
      data: payload,
      ...config,
    });
    if (method !== 'GET') {
      await this.clearCache();
    }
    return response.data?.data || response.data || response;
  }

  async getMetadata(): Promise<{ resource: string; total_count: number; last_modified: string; etag: string } | null> {
    try {
      const response = await api.get(`${this.endpoint}/metadata`);
      return response.data?.data || response.data;
    } catch (error: any) {
      return null;
    }
  }

  async getSince(since: string): Promise<T[]> {
    const response = await api.get(this.endpoint, { params: { since } });
    return extractListFromResponse(response, this.options.preferredListKeys);
  }

  async getWithConditionalHeaders(
    params?: Record<string, any>,
    etag?: string,
    lastModified?: string
  ): Promise<{ data: T[]; etag?: string; lastModified?: string; status: number }> {
    const headers: Record<string, string> = {};
    if (etag) headers['If-None-Match'] = etag;
    if (lastModified) headers['If-Modified-Since'] = lastModified;

    const response = await api.get(this.endpoint, {
      params,
      headers,
      validateStatus: (status) => status === 200 || status === 304,
    });

    if (response.status === 304) {
      const cacheKey = this.getCacheKey(params);
      const cached = await this.getFromCache(cacheKey);
      return { data: (cached as T[]) || [], etag, lastModified, status: 304 };
    }

    const data = extractListFromResponse(response, this.options.preferredListKeys);
    const newETag = response.headers['etag'] || response.headers['ETag'];
    const newLastModified = response.headers['last-modified'] || response.headers['Last-Modified'];
    this.setCache(this.getCacheKey(params), data);

    return { data, etag: newETag, lastModified: newLastModified, status: 200 };
  }
}
