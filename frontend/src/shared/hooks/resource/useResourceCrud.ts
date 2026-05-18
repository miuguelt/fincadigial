import { useCallback } from 'react';
import type { BaseService } from '@/shared/api/base-service';
import { UseResourceResult } from './types';

export function useResourceCrud<T extends { id?: number | string }>(
  service: BaseService<T>,
  data: T[],
  setData: React.Dispatch<React.SetStateAction<T[]>>,
  safeExecuteMutation: <R>(fn: () => Promise<R>) => Promise<R | undefined>,
  invalidateByEndpoint: (prefix: string) => void,
  prefix: string,
  crudInProgressRef: React.MutableRefObject<boolean>,
  skipCacheUntilRef: React.MutableRefObject<number>,
  refetch: () => Promise<any>,
  tracker: ReturnType<typeof import('./useResourceTracker').useResourceTracker>
) {
  const {
    recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems,
    recentlyUpdatedIds, recentlyUpdatedTimestamps, recentlyUpdatedItems,
    recentlyDeletedIds, recentlyDeletedTimestamps
  } = tracker as any;

  const createItem = useCallback(async (payload: Partial<T>) => {
    crudInProgressRef.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        const created = await service.create(payload);
        const createdId = String((created as any)?.id);
        if (createdId && createdId !== 'undefined') {
          recentlyCreatedIds.current.add(createdId);
          recentlyCreatedTimestamps.current.set(createdId, Date.now());
          recentlyCreatedItems.current.set(createdId, created);

          const now = Date.now();
          for (const [id, timestamp] of Array.from(recentlyCreatedTimestamps.current.entries())) {
            if (now - timestamp > 120000) {
              recentlyCreatedIds.current.delete(id);
              recentlyCreatedTimestamps.current.delete(id);
              recentlyCreatedItems.current.delete(id);
            }
          }
        }

        invalidateByEndpoint(prefix);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
        skipCacheUntilRef.current = Date.now() + 30000;

        setData((prev: T[]) => {
          const arr = Array.isArray(prev) ? prev : [];
          const createdIdRaw = (created as any)?.id;
          const createdIdKey = createdIdRaw != null ? String(createdIdRaw) : null;
          const dedup = createdIdKey != null ? arr.filter((x: any) => String(x?.id) !== createdIdKey) : arr;
          return [created as any, ...dedup];
        });

        return created;
      });
      return result === undefined ? null : result;
    } catch (error) {
      throw error;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix, setData, recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems, skipCacheUntilRef, crudInProgressRef]);

  const updateItem = useCallback(async (id: number | string, payload: Partial<T>) => {
    crudInProgressRef.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        const updatedRaw = await service.update(id, payload);
        const updated = (updatedRaw && typeof updatedRaw === 'object')
          ? { ...(payload as any), ...(updatedRaw as any) }
          : { ...(payload as any), id };

        const updatedId = String(id);
        if (updatedId && updatedId !== 'undefined') {
          recentlyUpdatedIds.current.add(updatedId);
          recentlyUpdatedTimestamps.current.set(updatedId, Date.now());
          recentlyUpdatedItems.current.set(updatedId, updated);
        }

        invalidateByEndpoint(prefix);
        if (typeof (service as any).clearCache === 'function') {
          (service as any).clearCache();
        }
        skipCacheUntilRef.current = Date.now() + 30000;

        const applyAliasSync = (prevItem: any, nextItem: any) => {
          const hasKey = (obj: any, key: string) => obj && Object.prototype.hasOwnProperty.call(obj, key);
          const mirrorIfNeeded = (a: string, b: string) => {
            const aExists = hasKey(prevItem, a) || hasKey(nextItem, a);
            const bExists = hasKey(prevItem, b) || hasKey(nextItem, b);
            if (!aExists && !bExists) return;
            const aVal = (nextItem as any)[a];
            const bVal = (nextItem as any)[b];
            if (aVal !== undefined && bVal === undefined && bExists) (nextItem as any)[b] = aVal;
            if (bVal !== undefined && aVal === undefined && aExists) (nextItem as any)[a] = bVal;
          };
          mirrorIfNeeded('diagnosis', 'description');
          mirrorIfNeeded('dosis', 'dose');
          mirrorIfNeeded('frequency', 'frecuencia');
          mirrorIfNeeded('observations', 'notes');
          mirrorIfNeeded('status', 'estado');
          return nextItem;
        };

        setData((prev: T[]) => prev.map((i: any) => {
          if (String(i?.id) !== String(id)) return i;
          const next = { ...i, ...updated };
          return applyAliasSync(i, next);
        }));

        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          void refetch();
        }

        return updated;
      });
      return result === undefined ? null : result;
    } catch (error) {
      throw error;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix, setData, refetch, recentlyUpdatedIds, recentlyUpdatedTimestamps, recentlyUpdatedItems, skipCacheUntilRef, crudInProgressRef]);

  const deleteItem = useCallback(async (id: number | string) => {
    crudInProgressRef.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        try {
          const ok = await service.delete(id);
          if (ok) {
            const deletedId = String(id);
            recentlyCreatedIds.current.delete(deletedId);
            recentlyCreatedTimestamps.current.delete(deletedId);
            recentlyCreatedItems.current.delete(deletedId);

            recentlyDeletedIds.current.add(deletedId);
            recentlyDeletedTimestamps.current.set(deletedId, Date.now());

            const now = Date.now();
            for (const [delId, timestamp] of Array.from(recentlyDeletedTimestamps.current.entries())) {
              if (now - timestamp > 10000) {
                recentlyDeletedIds.current.delete(delId);
                recentlyDeletedTimestamps.current.delete(delId);
              }
            }

            invalidateByEndpoint(prefix);
            if (typeof (service as any).clearCache === 'function') {
              (service as any).clearCache();
            }
            skipCacheUntilRef.current = Date.now() + 15000;
            setData((prev: T[]) => prev.filter((i: any) => String(i?.id) !== String(id)));
          }
          return ok;
        } catch (err: any) {
          if (err?.response?.status === 404) {
            const deletedId = String(id);
            recentlyCreatedIds.current.delete(deletedId);
            recentlyCreatedTimestamps.current.delete(deletedId);
            recentlyCreatedItems.current.delete(deletedId);

            recentlyDeletedIds.current.add(deletedId);
            recentlyDeletedTimestamps.current.set(deletedId, Date.now());

            invalidateByEndpoint(prefix);
            if (typeof (service as any).clearCache === 'function') {
              (service as any).clearCache();
            }
            skipCacheUntilRef.current = Date.now() + 15000;
            setData((prev: T[]) => prev.filter((i: any) => String(i?.id) !== String(id)));
          }
          throw err;
        }
      });
      return result === undefined ? false : result;
    } catch (err) {
      throw err;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [service, safeExecuteMutation, invalidateByEndpoint, prefix, setData, recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems, recentlyDeletedIds, recentlyDeletedTimestamps, skipCacheUntilRef, crudInProgressRef]);

  return { createItem, updateItem, deleteItem };
}

