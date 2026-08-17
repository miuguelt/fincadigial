import { useCallback } from 'react';
import type { BaseService } from '@/shared/api/base-service';
import type { useResourceTracker } from './useResourceTracker';

/** Ventana en la que se ignora la caché tras una escritura, en milisegundos. */
const SKIP_CACHE_AFTER_WRITE_MS = 30000;
const SKIP_CACHE_AFTER_DELETE_MS = 15000;
const RECENTLY_DELETED_TTL_MS = 10000;
const RECENTLY_CREATED_TTL_MS = 120000;

/**
 * Algunos formularios y la API no coinciden en el nombre del campo. Si el
 * servidor devuelve uno solo, se refleja en su alias para que la fila no
 * aparezca a medias tras guardar.
 */
const ALIAS_PAIRS: Array<[string, string]> = [
  ['diagnosis', 'description'],
  ['dosis', 'dose'],
  ['frequency', 'frecuencia'],
  ['observations', 'notes'],
  ['status', 'estado'],
];

const applyAliasSync = (prevItem: any, nextItem: any) => {
  const hasKey = (obj: any, key: string) => obj && Object.prototype.hasOwnProperty.call(obj, key);
  for (const [a, b] of ALIAS_PAIRS) {
    const aExists = hasKey(prevItem, a) || hasKey(nextItem, a);
    const bExists = hasKey(prevItem, b) || hasKey(nextItem, b);
    if (!aExists && !bExists) continue;
    const aVal = nextItem[a];
    const bVal = nextItem[b];
    if (aVal !== undefined && bVal === undefined && bExists) nextItem[b] = aVal;
    if (bVal !== undefined && aVal === undefined && aExists) nextItem[a] = bVal;
  }
  return nextItem;
};

const pruneExpired = (timestamps: Map<string, number>, ttlMs: number, onExpire: (id: string) => void) => {
  const now = Date.now();
  for (const [id, ts] of Array.from(timestamps.entries())) {
    if (now - ts > ttlMs) onExpire(id);
  }
};

interface CrudDeps<T> {
  service: BaseService<T>;
  setData: React.Dispatch<React.SetStateAction<T[]>>;
  safeExecuteMutation: <R>(fn: () => Promise<R>) => Promise<R | undefined>;
  invalidateByEndpoint: (prefix: string) => void;
  prefix: string;
  crudInProgressRef: React.MutableRefObject<boolean>;
  skipCacheUntilRef: React.MutableRefObject<number>;
  refetch: () => Promise<any>;
  tracker: ReturnType<typeof useResourceTracker<any>>;
}

/**
 * Crear, actualizar y eliminar con actualización optimista.
 *
 * Cada operación invalida la caché, marca una ventana sin caché y anota el id
 * en el tracker, para que un refetch inmediato no revierta lo que el usuario
 * acaba de ver.
 */
export function useResourceCrud<T extends { id?: number | string }>(deps: CrudDeps<T>) {
  const {
    service, setData, safeExecuteMutation, invalidateByEndpoint, prefix,
    crudInProgressRef, skipCacheUntilRef, refetch, tracker,
  } = deps;

  const {
    recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems,
    recentlyUpdatedIds, recentlyUpdatedTimestamps, recentlyUpdatedItems,
    recentlyDeletedIds, recentlyDeletedTimestamps,
  } = tracker;

  const invalidateCaches = useCallback((skipMs: number) => {
    invalidateByEndpoint(prefix);
    if (typeof (service as any).clearCache === 'function') {
      (service as any).clearCache();
    }
    skipCacheUntilRef.current = Date.now() + skipMs;
  }, [invalidateByEndpoint, prefix, service, skipCacheUntilRef]);

  const forgetCreated = useCallback((id: string) => {
    recentlyCreatedIds.current.delete(id);
    recentlyCreatedTimestamps.current.delete(id);
    recentlyCreatedItems.current.delete(id);
  }, [recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems]);

  const createItem = useCallback(async (payload: Partial<T>) => {
    crudInProgressRef.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        const createdRaw = await service.create(payload);

        // Sin conexión el servidor no asigna id: uno temporal mantiene la fila
        // identificable hasta que la sincronización traiga el definitivo.
        const rawId = (createdRaw as any)?.id;
        const assignedId = (rawId != null && rawId !== 'undefined' && rawId !== '')
          ? rawId
          : `temp_offline_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        const created: T = {
          ...(createdRaw as any),
          id: assignedId,
          _is_offline_pending: (createdRaw as any)?._is_offline_pending
            ?? (typeof navigator !== 'undefined' && !navigator.onLine),
        };

        const createdId = String(assignedId);
        recentlyCreatedIds.current.add(createdId);
        recentlyCreatedTimestamps.current.set(createdId, Date.now());
        recentlyCreatedItems.current.set(createdId, created);
        pruneExpired(recentlyCreatedTimestamps.current, RECENTLY_CREATED_TTL_MS, forgetCreated);

        invalidateCaches(SKIP_CACHE_AFTER_WRITE_MS);

        setData((prev) => {
          const arr = Array.isArray(prev) ? prev : [];
          const dedup = arr.filter((x: any) => String(x?.id) !== createdId);
          return [created, ...dedup];
        });

        return created;
      });
      return result === undefined ? null : result;
    } catch (error) {
      // La UI necesita el detalle real del fallo, no un null silencioso.
      console.error('[useResource] Error al crear item:', error);
      throw error;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [
    service, safeExecuteMutation, invalidateCaches, setData, forgetCreated,
    recentlyCreatedIds, recentlyCreatedTimestamps, recentlyCreatedItems, crudInProgressRef,
  ]);

  const updateItem = useCallback(async (id: number | string, payload: Partial<T>) => {
    crudInProgressRef.current = true;
    try {
      const result = await safeExecuteMutation(async () => {
        // patch cuando el servicio lo expone: evita pisar campos no enviados.
        const patchFn = typeof service.patch === 'function' ? service.patch : service.update;
        const updatedRaw = await patchFn.call(service, id, payload);
        const updated = (updatedRaw && typeof updatedRaw === 'object')
          ? { ...(payload as any), ...(updatedRaw as any) }
          : { ...(payload as any), id };

        const updatedId = String(id);
        if (updatedId && updatedId !== 'undefined') {
          recentlyUpdatedIds.current.add(updatedId);
          recentlyUpdatedTimestamps.current.set(updatedId, Date.now());
          recentlyUpdatedItems.current.set(updatedId, updated);
        }

        invalidateCaches(SKIP_CACHE_AFTER_WRITE_MS);

        setData((prev) => prev.map((i: any) => {
          if (String(i?.id) !== String(id)) return i;
          return applyAliasSync(i, { ...i, ...updated });
        }));

        if (typeof navigator === 'undefined' || navigator.onLine !== false) {
          void refetch().catch(() => { /* noop */ });
        }

        return updated;
      });
      return result === undefined ? null : result;
    } catch (error) {
      console.error('[useResource] Error al actualizar item:', error);
      throw error;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [
    service, safeExecuteMutation, invalidateCaches, setData, refetch,
    recentlyUpdatedIds, recentlyUpdatedTimestamps, recentlyUpdatedItems, crudInProgressRef,
  ]);

  const deleteItem = useCallback(async (id: number | string) => {
    crudInProgressRef.current = true;
    const deletedId = String(id);

    /** Un 404 significa que ya no está: mismo efecto local que un borrado exitoso. */
    const dropLocally = () => {
      forgetCreated(deletedId);
      recentlyDeletedIds.current.add(deletedId);
      recentlyDeletedTimestamps.current.set(deletedId, Date.now());
      pruneExpired(recentlyDeletedTimestamps.current, RECENTLY_DELETED_TTL_MS, (expired) => {
        recentlyDeletedIds.current.delete(expired);
        recentlyDeletedTimestamps.current.delete(expired);
      });
      invalidateCaches(SKIP_CACHE_AFTER_DELETE_MS);
      setData((prev) => prev.filter((i: any) => String(i?.id) !== deletedId));
    };

    try {
      const result = await safeExecuteMutation(async () => {
        try {
          const ok = await service.delete(id);
          if (ok) dropLocally();
          return ok;
        } catch (err: any) {
          if (err?.response?.status === 404) dropLocally();
          throw err;
        }
      });
      return result === undefined ? false : result;
    } catch (err) {
      console.error('[useResource] Error al eliminar item:', err);
      throw err;
    } finally {
      crudInProgressRef.current = false;
    }
  }, [
    service, safeExecuteMutation, invalidateCaches, setData, forgetCreated,
    recentlyDeletedIds, recentlyDeletedTimestamps, crudInProgressRef,
  ]);

  return { createItem, updateItem, deleteItem };
}
