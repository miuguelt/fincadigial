/*
 * FloatingScrollArea
 *
 * Área con scroll nativo y barras de desplazamiento *flotantes*: se dibujan
 * encima del contenido (position: absolute) en lugar de reservar una pista de
 * 10-14 px a cada lado. Así la tabla usa todo el alto y todo el ancho
 * disponibles, y la barra sigue estando siempre a mano para arrastrarla con el
 * puntero.
 *
 * Por qué a mano y no con `overflow: overlay` o `::-webkit-scrollbar`:
 * `overflow: overlay` se eliminó de Chromium y las barras de webkit siempre
 * consumen espacio de layout. La única forma estable de tener barras que
 * floten es pintarlas nosotros.
 *
 * El scroll sigue siendo nativo: rueda, teclado, trackpad y gestos táctiles no
 * se tocan. Lo único propio es el pulgar que se ve y se arrastra.
 *
 * Ver docs/estandar-pantallas-de-datos.md §1.2b.
 */

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/shared/ui/cn.ts';

/** Largo mínimo del pulgar para que siga siendo agarrable en listas enormes. */
const MIN_THUMB = 32;
/** Separación del pulgar respecto al borde de la caja. */
const INSET = 3;
/** Milisegundos que el pulgar se queda opaco tras dejar de desplazar. */
const ACTIVE_MS = 900;

type Axis = 'x' | 'y';

interface ThumbGeometry {
  visible: boolean;
  size: number;
  offset: number;
}

const HIDDEN: ThumbGeometry = { visible: false, size: 0, offset: 0 };

function sameThumb(a: ThumbGeometry, b: ThumbGeometry): boolean {
  return a.visible === b.visible && a.size === b.size && a.offset === b.offset;
}

/**
 * Conserva el objeto anterior cuando la geometría no cambió. Sin esto, medir en
 * cada render devolvería siempre un objeto nuevo, React vería estado distinto y
 * el ciclo medir → render → medir no pararía nunca ("Maximum update depth").
 */
function keepIfEqual(previous: ThumbGeometry, next: ThumbGeometry): ThumbGeometry {
  return sameThumb(previous, next) ? previous : next;
}

function computeThumb(
  viewport: number,
  content: number,
  scrolled: number,
  track: number,
): ThumbGeometry {
  const maxScroll = content - viewport;
  if (maxScroll <= 1 || track <= 0) return HIDDEN;
  const size = Math.max(MIN_THUMB, Math.round((viewport / content) * track));
  const travel = Math.max(track - size, 0);
  const progress = Math.min(Math.max(scrolled / maxScroll, 0), 1);
  return { visible: true, size, offset: Math.round(progress * travel) };
}

/**
 * Traduce el arrastre del pulgar a scroll del contenedor. Se queda escuchando
 * en `window` para que el gesto sobreviva a salirse de la caja con el ratón.
 */
function beginDrag(
  el: HTMLDivElement,
  axis: Axis,
  event: React.PointerEvent<HTMLDivElement>,
  thumbSize: number,
  onEnd: () => void,
) {
  const isY = axis === 'y';
  const track = (isY ? el.clientHeight : el.clientWidth) - INSET * 2;
  const travel = Math.max(track - thumbSize, 1);
  const maxScroll = isY ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  const origin = isY ? event.clientY : event.clientX;
  const originScroll = isY ? el.scrollTop : el.scrollLeft;

  const onMove = (moveEvent: PointerEvent) => {
    const delta = (isY ? moveEvent.clientY : moveEvent.clientX) - origin;
    const next = originScroll + (delta / travel) * maxScroll;
    if (isY) el.scrollTop = next;
    else el.scrollLeft = next;
  };

  const onUp = () => {
    onEnd();
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
  };

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
}

/**
 * Mide los pulgares, los mantiene al día y expone el arranque del arrastre.
 * Vive aparte del componente para que cada pieza siga siendo legible.
 */
function useFloatingScrollbars(
  elementRef: React.MutableRefObject<HTMLDivElement | null>,
  { horizontal, vertical }: { horizontal: boolean; vertical: boolean },
) {
  const [vThumb, setVThumb] = useState<ThumbGeometry>(HIDDEN);
  const [hThumb, setHThumb] = useState<ThumbGeometry>(HIDDEN);
  const [active, setActive] = useState(false);
  const [dragging, setDragging] = useState<Axis | null>(null);
  const activeTimer = useRef<number | undefined>(undefined);
  const sizes = useRef({ x: 0, y: 0 });

  sizes.current = { x: hThumb.size, y: vThumb.size };

  const measure = useCallback(() => {
    const el = elementRef.current;
    if (!el) return;
    const trackY = el.clientHeight - INSET * 2;
    const trackX = el.clientWidth - INSET * 2;
    const nextV = vertical ? computeThumb(el.clientHeight, el.scrollHeight, el.scrollTop, trackY) : HIDDEN;
    const nextH = horizontal ? computeThumb(el.clientWidth, el.scrollWidth, el.scrollLeft, trackX) : HIDDEN;
    setVThumb((prev) => keepIfEqual(prev, nextV));
    setHThumb((prev) => keepIfEqual(prev, nextH));
  }, [elementRef, horizontal, vertical]);

  // Sin lista de dependencias a propósito: cada render puede haber cambiado el
  // número de filas, y leer cuatro propiedades de layout sale más barato que
  // observar las mutaciones del subárbol.
  useLayoutEffect(measure);

  useEffect(() => {
    const el = elementRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [elementRef, measure]);

  useEffect(() => () => window.clearTimeout(activeTimer.current), []);

  const handleScroll = useCallback(() => {
    measure();
    setActive(true);
    window.clearTimeout(activeTimer.current);
    activeTimer.current = window.setTimeout(() => setActive(false), ACTIVE_MS);
  }, [measure]);

  const startDrag = useCallback((axis: Axis) => (event: React.PointerEvent<HTMLDivElement>) => {
    const el = elementRef.current;
    if (!el || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setDragging(axis);
    beginDrag(el, axis, event, sizes.current[axis], () => setDragging(null));
  }, [elementRef]);

  // En reposo el pulgar se ve pero discreto; al desplazar o al arrastrarlo pasa
  // a contraste pleno (el hover de la caja lo sube desde CSS).
  return { vThumb, hThumb, dragging, prominent: active || dragging !== null, handleScroll, startDrag };
}

interface ThumbProps {
  axis: Axis;
  geometry: ThumbGeometry;
  prominent: boolean;
  dragging: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function Thumb({ axis, geometry, prominent, dragging, onPointerDown }: ThumbProps) {
  if (!geometry.visible) return null;
  const isY = axis === 'y';

  return (
    <div
      role="presentation"
      onPointerDown={onPointerDown}
      className={cn(
        'absolute z-30 touch-none',
        isY ? 'right-0 w-4 px-[3px]' : 'bottom-0 h-4 py-[3px]',
        dragging ? 'cursor-grabbing' : 'cursor-grab',
      )}
      style={
        isY
          ? { top: INSET + geometry.offset, height: geometry.size }
          : { left: INSET + geometry.offset, width: geometry.size }
      }
    >
      <div
        data-prominent={prominent}
        data-dragging={dragging}
        className="floating-scroll-thumb h-full w-full rounded-full transition-[background-color] duration-200"
      />
    </div>
  );
}

export interface FloatingScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Clases del elemento con scroll (el que recibe `overflow`). */
  className?: string;
  /** Clases del contenedor posicionado que aloja las barras flotantes. */
  containerClassName?: string;
  /** `false` desactiva el eje horizontal (queda `overflow-x: hidden`). */
  horizontal?: boolean;
  /** `false` desactiva el eje vertical. */
  vertical?: boolean;
  scrollRef?: React.MutableRefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}

export function FloatingScrollArea({
  className,
  containerClassName,
  horizontal = true,
  vertical = true,
  scrollRef,
  children,
  ...rest
}: FloatingScrollAreaProps) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const { vThumb, hThumb, dragging, prominent, handleScroll, startDrag } =
    useFloatingScrollbars(innerRef, { horizontal, vertical });

  const setNode = useCallback((node: HTMLDivElement | null) => {
    innerRef.current = node;
    if (scrollRef) scrollRef.current = node;
  }, [scrollRef]);

  return (
    <div className={cn('relative min-h-0 min-w-0 group/fsa', containerClassName)}>
      <div
        {...rest}
        ref={setNode}
        onScroll={handleScroll}
        className={cn(
          'h-full w-full min-h-0 no-native-scrollbar',
          vertical ? 'overflow-y-auto' : 'overflow-y-hidden',
          horizontal ? 'overflow-x-auto' : 'overflow-x-hidden',
          dragging && 'select-none',
          className,
        )}
      >
        {children}
      </div>

      <Thumb
        axis="y"
        geometry={vThumb}
        prominent={prominent}
        dragging={dragging === 'y'}
        onPointerDown={startDrag('y')}
      />
      <Thumb
        axis="x"
        geometry={hThumb}
        prominent={prominent}
        dragging={dragging === 'x'}
        onPointerDown={startDrag('x')}
      />
    </div>
  );
}

export default FloatingScrollArea;
