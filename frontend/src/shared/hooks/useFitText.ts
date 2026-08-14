/**
 * useFitText — ajusta el tamaño de letra al ancho real del contenedor.
 *
 * Devuelve una `ref`. El elemento referenciado conserva el tamaño que le dan
 * sus clases CSS mientras el texto quepa; cuando no cabe, se reduce lo justo
 * para que **ninguna palabra se parta** y no se superen `maxLines` renglones.
 *
 * El trabajo lo agrupa `fitScheduler`: un solo ResizeObserver y un solo reflow
 * por frame para toda la página. El elemento debe llevar la clase `.fit-text`
 * (la pone `<FitText>`) para que `refitAll` lo encuentre.
 *
 * El elemento debe recibir su ancho del contenedor, no de su contenido: en un
 * flex, el envoltorio necesita `flex-1 min-w-0`. Si el ancho depende del texto,
 * la medida oscila. Ver docs/estandar-texto-adaptable.md.
 */
import { useCallback, useEffect, useRef } from 'react';
import { observeFit, refitAll } from '@/shared/lib/fitScheduler';

export interface FitTextOptions {
  /** Renglones permitidos antes de encoger. 1 = todo en una sola línea. */
  maxLines?: number;
  /** Suelo de reducción respecto al tamaño declarado en CSS. */
  minScale?: number;
  /** Valores que, al cambiar, obligan a volver a medir (normalmente el texto). */
  deps?: unknown[];
}

let fontsHooked = false;

/** Las webfonts llegan tras el primer pintado y cambian las métricas. */
function hookWebfonts() {
  if (fontsHooked || typeof document === 'undefined' || !document.fonts) return;
  fontsHooked = true;
  document.fonts.ready.then(() => refitAll()).catch(() => undefined);
}

export function useFitText<T extends HTMLElement>(options: FitTextOptions = {}) {
  const { maxLines = 1, minScale = 0.55, deps = [] } = options;
  const ref = useRef<T | null>(null);
  const release = useRef<(() => void) | null>(null);

  const attach = useCallback(
    (el: T | null) => {
      release.current?.();
      release.current = null;
      ref.current = el;
      if (el) {
        hookWebfonts();
        release.current = observeFit(el, maxLines, minScale);
      }
    },
    [maxLines, minScale],
  );

  // Al cambiar el texto hay que remedir: el nodo es el mismo, así que el
  // ResizeObserver no dispara por sí solo.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    release.current?.();
    release.current = observeFit(el, maxLines, minScale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxLines, minScale, ...deps]);

  useEffect(() => () => release.current?.(), []);

  return attach;
}

export default useFitText;
