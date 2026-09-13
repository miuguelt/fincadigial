import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __endpointBackoffUntil,
  __resourceInflight,
  __resourceLastFetchAt,
  useResourceRefetch,
} from './useResourceRefetch';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
}

describe('useResourceRefetch', () => {
  beforeEach(() => {
    __endpointBackoffUntil.clear();
    __resourceInflight.clear();
    __resourceLastFetchAt.clear();
  });

  it('starts a new request when a forced refresh supersedes an in-flight request', async () => {
    const firstResponse = deferred<any>();
    const service = {
      getPaginated: vi.fn()
        .mockReturnValueOnce(firstResponse.promise)
        .mockResolvedValueOnce({
          data: [{ id: 2, description: 'registro nuevo' }],
          total_items: 1,
          page: 1,
          limit: 10,
          total_pages: 1,
        }),
    } as any;
    const setData = vi.fn();
    const cancelSourceRef = { current: { cancel: vi.fn(), token: {} } } as any;
    const { result } = renderHook(() => useResourceRefetch({
      service,
      data: [],
      setData,
      setMeta: vi.fn(),
      setRefreshing: vi.fn(),
      safeExecute: async (fn: any) => fn(),
      buildEffectiveParams: () => ({ page: 1, limit: 10 }),
      prefix: 'control',
      generateKey: () => 'control:page-1',
      getCache: vi.fn(),
      setCache: vi.fn(),
      cacheTTL: undefined,
      cache: false,
      map: undefined,
      searchQP: undefined,
      lastParamsRef: { current: undefined },
      cancelSourceRef,
      skipCacheUntilRef: { current: 0 },
      tracker: {
        recentlyCreatedIds: { current: new Set<string>() },
        recentlyCreatedItems: { current: new Map() },
        recentlyUpdatedIds: { current: new Set<string>() },
        recentlyUpdatedItems: { current: new Map() },
        recentlyDeletedIds: { current: new Set<string>() },
        applyStableOrder: (list: any[]) => list,
      },
      createCancelSource: () => ({ cancel: vi.fn(), token: {} }),
    } as any));

    const initial = result.current.refetch();
    const forced = result.current.refetch(undefined, { force: true });

    expect(service.getPaginated).toHaveBeenCalledTimes(2);
    firstResponse.resolve({
      data: [{ id: 1, description: 'registro anterior' }],
      total_items: 1,
      page: 1,
      limit: 10,
      total_pages: 1,
    });

    await expect(forced).resolves.toEqual([{ id: 2, description: 'registro nuevo' }]);
    await initial;
  });
});
