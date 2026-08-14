import { useCallback, useState } from 'react';

export function useCrudSelection<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((previous) => previous.includes(id) ? previous.filter((itemId) => itemId !== id) : [...previous, id]);
  }, []);

  const clearSelection = useCallback(() => setSelectedIds([]), []);

  const toggleSelectAll = useCallback(() => {
    const allIds = items.map((item) => item.id);
    setSelectedIds((previous) => previous.length === allIds.length ? [] : allIds);
  }, [items]);

  return { selectedIds, setSelectedIds, toggleSelect, clearSelection, toggleSelectAll };
}
