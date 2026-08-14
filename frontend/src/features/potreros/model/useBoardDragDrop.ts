import React, { useCallback, useEffect, useRef, useState } from 'react';

export const UNASSIGNED_COLUMN = 'unassigned' as const;
export type ColumnKey = number | typeof UNASSIGNED_COLUMN;

interface DragState {
  animalId: number;
  pointerId: number;
  x: number;
  y: number;
  started: boolean;
}

interface Options {
  enabled: boolean;
  onDrop: (animalId: number, target: ColumnKey) => void;
}

/**
 * Arrastrar y soltar por punteros, activo solo con ratón.
 *
 * En pantalla táctil el arrastre provocaba traslados accidentales y era casi
 * imposible de completar entre columnas, así que allí se usa la selección.
 */
export function useBoardDragDrop({ enabled, onDrop }: Options) {
  const dragRef = useRef<DragState | null>(null);
  const dropTargetRef = useRef<ColumnKey | null>(null);
  const suppressClickRef = useRef(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnKey | null>(null);

  const [pointerIsFine, setPointerIsFine] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setPointerIsFine(window.matchMedia('(pointer: fine)').matches);
  }, []);

  const active = enabled && pointerIsFine;

  const setTarget = useCallback((target: ColumnKey | null) => {
    dropTargetRef.current = target;
    setDropTarget(target);
  }, []);

  const releaseCursor = () => {
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  useEffect(() => releaseCursor, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, animalId: number) => {
      if (!active || event.button !== 0) return;
      if ((event.target as HTMLElement).closest('button, a, input, [data-no-drag]')) return;
      dragRef.current = { animalId, pointerId: event.pointerId, x: event.clientX, y: event.clientY, started: false };
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Algunos navegadores embebidos no soportan pointer capture.
      }
    },
    [active],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;

      if (!drag.started) {
        if (Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
        drag.started = true;
        suppressClickRef.current = true;
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
        setDraggingId(drag.animalId);
      }

      event.preventDefault();
      const column = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>('[data-drop-column]')?.dataset.dropColumn;
      if (!column) setTarget(null);
      else setTarget(column === UNASSIGNED_COLUMN ? UNASSIGNED_COLUMN : Number(column));
    },
    [setTarget],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const { started, animalId } = drag;
      const target = dropTargetRef.current;
      dragRef.current = null;
      setDraggingId(null);
      setTarget(null);
      releaseCursor();
      if (started && target !== null) onDrop(animalId, target);
    },
    [onDrop, setTarget],
  );

  /** El clic que cierra un arrastre no debe abrir la ficha del animal. */
  const consumeClickAfterDrag = useCallback(() => {
    if (!suppressClickRef.current) return false;
    suppressClickRef.current = false;
    return true;
  }, []);

  return {
    active,
    draggingId,
    dropTarget,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    consumeClickAfterDrag,
  };
}
