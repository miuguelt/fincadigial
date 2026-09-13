import { useEffect, useRef } from 'react';

/**
 * Abre el modal de detalle del registro indicado al cargar la tabla por
 * primera vez. Permite enlaces directos entre vistas del mismo módulo
 * (ej. de un tratamiento a su caso clínico dentro del módulo Sanidad).
 */
export function useCrudInitialDetail<T extends { id: number }>(
  initialDetailId: number | null | undefined,
  items: T[],
  openDetail: (item: T) => void
) {
  const shownRef = useRef(false);

  useEffect(() => {
    if (!initialDetailId || shownRef.current) return;
    if (!items || items.length === 0) return;
    const target = items.find((i) => Number(i.id) === Number(initialDetailId));
    if (!target) return;
    shownRef.current = true;
    openDetail(target);
  }, [initialDetailId, items, openDetail]);
}
