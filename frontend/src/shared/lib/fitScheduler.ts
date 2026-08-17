/**
 * fitScheduler — coordinador global del ajuste tipográfico.
 *
 * Todos los `<FitText>` de la página comparten **un solo ResizeObserver** y
 * **un solo lote por frame**. El lote hace las tres fases separadas:
 *
 *   1. invalidar  → se borra `style.fontSize` de todos los nodos a la vez
 *   2. leer       → se leen anchos y tamaños base (un único reflow para todos)
 *   3. escribir   → se aplica el nuevo tamaño a todos
 *
 * Mezclar lectura y escritura nodo a nodo cuesta un reflow por nodo (layout
 * thrashing). Separadas, el navegador recalcula el layout una sola vez por
 * lote, que es lo que permite usar esto en componentes compartidos como
 * `CardTitle` sin penalizar pantallas con decenas de tarjetas.
 *
 * Ver docs/estandar-texto-adaptable.md.
 */
import { computeFitScale } from './textFit';

export interface FitEntry {
  el: HTMLElement;
  maxLines: number;
  minScale: number;
  /**
   * Modo `.fit-clamp`, el relevo de `truncate`. La altura es intocable —una
   * celda de tabla no puede crecer— así que el texto se queda en un renglón:
   * primero se encoge la letra y solo se recorta con puntos suspensivos lo que
   * aún no quepa al tamaño mínimo. Muestra más texto que `truncate`, que
   * recortaba sin intentar nada.
   */
  clip: boolean;
  /** Último ancho medido: si no cambia, no se recalcula. */
  lastWidth: number;
}

const registry = new WeakMap<Element, FitEntry>();
const pending = new Set<FitEntry>();
let frame = 0;
let timer = 0;
let observer: ResizeObserver | null = null;

function horizontalPadding(cs: CSSStyleDeclaration): number {
  const pad = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
  return Number.isFinite(pad) ? pad : 0;
}

function flush() {
  if (frame && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frame);
  if (timer) clearTimeout(timer);
  frame = 0;
  timer = 0;
  const entries = [...pending];
  pending.clear();
  if (!entries.length) return;

  // 1. Invalidar: se vuelve al tamaño que declaran las clases CSS, para no
  //    acumular reducciones al cruzar un breakpoint (text-xl → md:text-2xl).
  for (const entry of entries) entry.el.style.fontSize = '';

  // 2. Leer: el primer getComputedStyle paga el reflow; el resto ya no, porque
  //    no hay ninguna escritura intercalada.
  const reads = entries.map((entry) => {
    const cs = getComputedStyle(entry.el);
    return {
      entry,
      basePx: parseFloat(cs.fontSize),
      width: entry.el.clientWidth - horizontalPadding(cs),
    };
  });

  // 3. Escribir.
  for (const read of reads) apply(read.entry, read.basePx, read.width);
}

/**
 * Suelo absoluto de legibilidad. Un `minScale` relativo no basta: sobre un
 * `text-xs` (12 px) el 62 % son 7,4 px, ilegibles a pleno sol y con el celular en
 * la mano, que es como se usa esta aplicación. Por debajo de este tamaño se
 * prefiere recortar (o envolver) antes que seguir encogiendo.
 */
const MIN_READABLE_PX = 11;

function apply(entry: FitEntry, basePx: number, width: number) {
  entry.lastWidth = width;
  // El suelo efectivo es el más alto de los dos: el relativo y el absoluto.
  const minScale = basePx > 0
    ? Math.min(1, Math.max(entry.minScale, MIN_READABLE_PX / basePx))
    : entry.minScale;
  const { scale, overflows, fitsLines } = computeFitScale({
    el: entry.el,
    text: entry.el.textContent ?? '',
    width,
    basePx,
    maxLines: entry.maxLines,
    minScale,
  });

  // En modo recorte la altura no puede crecer: si ni al mínimo entra en el
  // renglón, se baja al mínimo y se recorta lo que sobre.
  const finalScale = entry.clip && !fitsLines ? minScale : scale;
  if (finalScale < 1) entry.el.style.fontSize = `${(basePx * finalScale).toFixed(2)}px`;

  const flag = entry.clip ? 'fitClip' : 'fitOverflow';
  const on = entry.clip ? !fitsLines : overflows;
  if (on) entry.el.dataset[flag] = entry.clip ? '1' : 'break';
  else delete entry.el.dataset[flag];
}

/**
 * Respaldo por temporizador: en una pestaña oculta el navegador no dispara
 * `requestAnimationFrame`, así que sin esto el texto montado en segundo plano
 * se quedaría sin ajustar. Gana el que llegue primero.
 */
const FALLBACK_MS = 32;

function schedule(entry: FitEntry) {
  pending.add(entry);
  if (frame || timer) return;
  if (typeof requestAnimationFrame === 'function') frame = requestAnimationFrame(flush);
  timer = setTimeout(flush, FALLBACK_MS) as unknown as number;
}

function getObserver(): ResizeObserver | null {
  if (observer || typeof ResizeObserver === 'undefined') return observer;
  observer = new ResizeObserver((records) => {
    for (const record of records) {
      const entry = registry.get(record.target);
      // El ancho es lo único que cambia el ajuste; el alto lo cambia el ajuste
      // mismo, y reaccionar a él realimentaría el bucle.
      if (entry && record.contentRect.width !== entry.lastWidth) schedule(entry);
    }
  });
  return observer;
}

/** Da de alta un elemento. Devuelve la baja. */
export function observeFit(
  el: HTMLElement,
  maxLines: number,
  minScale: number,
  clip = false,
): () => void {
  const entry: FitEntry = { el, maxLines, minScale, clip, lastWidth: -1 };
  registry.set(el, entry);
  schedule(entry);
  getObserver()?.observe(el);

  return () => {
    pending.delete(entry);
    registry.delete(el);
    getObserver()?.unobserve(el);
  };
}

/**
 * Vuelve a medir un elemento ya registrado. Hace falta cuando cambia el texto
 * pero no el ancho: el ResizeObserver no se entera de eso.
 */
export function remeasureFit(el: Element): boolean {
  const entry = registry.get(el);
  if (!entry) return false;
  entry.lastWidth = -1;
  schedule(entry);
  return true;
}

/** Fuerza un recálculo de todo lo registrado (webfonts, cambio de tema). */
export function refitAll(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('.fit-text').forEach((el) => {
    const entry = registry.get(el);
    if (entry) {
      entry.lastWidth = -1;
      schedule(entry);
    }
  });
}
