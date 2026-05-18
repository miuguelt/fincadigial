import { useRef, useCallback } from 'react';

export function useResourceTracker<T>() {
  const recentlyCreatedIds = useRef<Set<string>>(new Set());
  const recentlyCreatedTimestamps = useRef<Map<string, number>>(new Map());
  const recentlyCreatedItems = useRef<Map<string, T>>(new Map());

  const recentlyUpdatedIds = useRef<Set<string>>(new Set());
  const recentlyUpdatedTimestamps = useRef<Map<string, number>>(new Map());
  const recentlyUpdatedItems = useRef<Map<string, T>>(new Map());

  const recentlyDeletedIds = useRef<Set<string>>(new Set());
  const recentlyDeletedTimestamps = useRef<Map<string, number>>(new Map());

  const applyStableOrder = useCallback((list: T[], currentData: T[]): T[] => {
    if (!Array.isArray(list) || list.length === 0) return list;
    if (!Array.isArray(currentData) || currentData.length === 0) return list;

    const now = Date.now();
    for (const [id, ts] of Array.from(recentlyUpdatedTimestamps.current.entries())) {
      if (now - ts > 120000) {
        recentlyUpdatedIds.current.delete(id);
        recentlyUpdatedTimestamps.current.delete(id);
        recentlyUpdatedItems.current.delete(id);
      }
    }

    if (recentlyUpdatedIds.current.size === 0) return list;

    const nextMap = new Map<string, T>();
    list.forEach((item) => {
      const id = String((item as any)?.id);
      if (id && id !== 'undefined') nextMap.set(id, item);
    });

    const ordered: T[] = [];
    const used = new Set<string>();
    currentData.forEach((prevItem) => {
      const id = String((prevItem as any)?.id);
      if (!id || id === 'undefined') return;
      const nextItem = nextMap.get(id);
      if (nextItem) {
        ordered.push(nextItem);
        used.add(id);
      }
    });

    list.forEach((item) => {
      const id = String((item as any)?.id);
      if (!id || id === 'undefined' || used.has(id)) return;
      ordered.push(item);
    });

    return ordered.length > 0 ? ordered : list;
  }, []);

  return {
    recentlyCreatedIds,
    recentlyCreatedTimestamps,
    recentlyCreatedItems,
    recentlyUpdatedIds,
    recentlyUpdatedTimestamps,
    recentlyUpdatedItems,
    recentlyDeletedIds,
    recentlyDeletedTimestamps,
    applyStableOrder
  };
}

