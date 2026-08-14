/**
 * textFit — medición de texto sin tocar el DOM.
 *
 * Calcula cuánto hay que reducir la tipografía para que un texto quepa en un
 * ancho dado **sin partir ninguna palabra**. Se mide sobre un `<canvas>` en
 * memoria: no provoca reflow, así que se puede llamar dentro de un
 * ResizeObserver sin disparar bucles de layout.
 *
 * Regla de la casa (estándar Villa Luz): las palabras nunca se cortan a la
 * mitad. Si no caben, encoge la letra; partir la palabra es el último recurso.
 * Ver docs/estandar-texto-adaptable.md.
 *
 * El ancho que devuelve `measureText` es exactamente lineal con el tamaño de
 * letra, y la suma de las palabras más los espacios coincide al 0,00 % con
 * medir la cadena entera (verificado también con `letter-spacing` de 1,5 px y
 * 3 px). Por eso se mide **una sola vez** a `REF_PX` y todo lo demás es
 * aritmética: el ajuste bajó de ~10 mediciones por nodo a 1.
 */

/** Margen frente a las diferencias entre canvas y el motor de layout real. */
const SAFETY = 0.98;

/** Iteraciones de la búsqueda binaria cuando se permite más de un renglón. */
const STEPS = 10;

/** Tamaño de referencia de la única medición real. */
const REF_PX = 100;

/** Techo de la caché de métricas: evita que crezca sin límite en tablas largas. */
const CACHE_MAX = 600;

let sharedContext: CanvasRenderingContext2D | null | undefined;

function getContext(): CanvasRenderingContext2D | null {
  if (sharedContext !== undefined) return sharedContext;
  sharedContext =
    typeof document === 'undefined'
      ? null
      : document.createElement('canvas').getContext('2d');
  return sharedContext;
}

export interface FontSpec {
  style: string;
  weight: string;
  family: string;
  letterSpacing: string;
  transform: string;
  wordSpacing: string;
}

export function readFontSpec(el: HTMLElement): FontSpec {
  const cs = getComputedStyle(el);
  return {
    style: cs.fontStyle || 'normal',
    weight: cs.fontWeight || '400',
    family: cs.fontFamily || 'sans-serif',
    letterSpacing: cs.letterSpacing === 'normal' ? '0px' : cs.letterSpacing,
    wordSpacing: cs.wordSpacing === 'normal' ? '0px' : cs.wordSpacing,
    transform: cs.textTransform || 'none',
  };
}

export function applyTransform(text: string, transform: string): string {
  if (transform.startsWith('upper')) return text.toUpperCase();
  if (transform.startsWith('lower')) return text.toLowerCase();
  return text;
}

/** Anchos a `REF_PX`. El ancho real es `valor * basePx / REF_PX * escala`. */
interface Metrics {
  words: number[];
  space: number;
  total: number;
  longest: number;
}

const cache = new Map<string, Metrics>();

function measureAtRef(
  ctx: CanvasRenderingContext2D,
  spec: FontSpec,
  words: string[],
): Metrics {
  ctx.font = `${spec.style} ${spec.weight} ${REF_PX}px ${spec.family}`;
  const measurer = ctx as CanvasRenderingContext2D & {
    letterSpacing?: string;
    wordSpacing?: string;
  };
  if ('letterSpacing' in measurer) measurer.letterSpacing = spec.letterSpacing;
  if ('wordSpacing' in measurer) measurer.wordSpacing = spec.wordSpacing;

  const widths = words.map((word) => ctx.measureText(word).width);
  const space = ctx.measureText(' ').width;
  return {
    words: widths,
    space,
    total: widths.reduce((a, b) => a + b, 0) + space * (widths.length - 1),
    longest: widths.reduce((a, b) => (b > a ? b : a), 0),
  };
}

function metricsFor(
  ctx: CanvasRenderingContext2D,
  spec: FontSpec,
  words: string[],
): Metrics {
  const key = `${spec.style}|${spec.weight}|${spec.family}|${spec.letterSpacing}|${spec.wordSpacing}|${words.join(' ')}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const metrics = measureAtRef(ctx, spec, words);
  if (cache.size >= CACHE_MAX) cache.clear();
  cache.set(key, metrics);
  return metrics;
}

/** Renglones que ocupa el reparto codicioso, el mismo criterio del navegador. */
function countLines(metrics: Metrics, unit: number, usable: number): number {
  let lines = 1;
  let current = 0;
  for (const width of metrics.words) {
    const word = width * unit;
    const candidate = current === 0 ? word : current + metrics.space * unit + word;
    if (current > 0 && candidate > usable) {
      lines += 1;
      current = word;
    } else {
      current = candidate;
    }
  }
  return lines;
}

export interface FitResult {
  /** Factor a aplicar sobre el tamaño declarado en CSS (≤ 1). */
  scale: number;
  /** `true` si ni al mínimo cabe la palabra más larga: hay que permitir corte. */
  overflows: boolean;
  /**
   * `true` si se logró respetar `maxLines`. Cuando es `false` el texto envuelve
   * en más renglones de los pedidos; quien no pueda crecer de alto (`.fit-clamp`)
   * usa esto para recortar como último recurso.
   */
  fitsLines: boolean;
}

export interface FitParams {
  el: HTMLElement;
  text: string;
  width: number;
  basePx: number;
  maxLines: number;
  minScale: number;
}

/** Mayor escala en [minScale, 1] que satisface `fits`. Aritmética pura. */
function searchScale(fits: (scale: number) => boolean, minScale: number): number {
  let low = minScale;
  let high = 1;
  for (let i = 0; i < STEPS; i += 1) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid;
    else high = mid;
  }
  return low;
}

/**
 * Escala que cumple `maxLines` sin partir palabras, o `null` si no existe
 * dentro de `[minScale, 1]`.
 */
function scaleForLines(
  metrics: Metrics,
  k: number,
  usable: number,
  maxLines: number,
  minScale: number,
): number | null {
  // Una sola línea sale de una división: no hace falta buscar.
  if (maxLines === 1) {
    const exact = usable / (metrics.total * k);
    if (exact >= 1) return 1;
    return exact >= minScale ? exact : null;
  }
  const fits = (scale: number) => countLines(metrics, k * scale, usable) <= maxLines;
  if (fits(1)) return 1;
  return fits(minScale) ? searchScale(fits, minScale) : null;
}

/**
 * Mayor escala ≤ 1 con la que el texto cabe en `width` sin partir palabras y
 * sin superar `maxLines` renglones.
 *
 * `maxLines` es la preferencia; que no se parta ninguna palabra es la regla.
 * Cuando el objetivo de renglones es inalcanzable —«Trasladar Ganado» en una
 * columna de 100 px no cabe en una línea ni al 55 %— **no se encoge hasta el
 * suelo para nada**: se conserva el mayor tamaño en el que ninguna palabra se
 * corta y el texto envuelve por el espacio.
 */
export function computeFitScale({
  el,
  text,
  width,
  basePx,
  maxLines,
  minScale,
}: FitParams): FitResult {
  const ctx = getContext();
  const idle = { scale: 1, overflows: false, fitsLines: true };
  if (!ctx || width <= 0 || basePx <= 0) return idle;

  const spec = readFontSpec(el);
  const words = applyTransform(text, spec.transform).trim().split(/\s+/).filter(Boolean);
  if (!words.length) return idle;

  const metrics = metricsFor(ctx, spec, words);
  const usable = width * SAFETY;
  const k = basePx / REF_PX;

  const byLines = scaleForLines(metrics, k, usable, maxLines, minScale);
  if (byLines !== null) return { scale: byLines, overflows: false, fitsLines: true };

  // El objetivo de renglones no se alcanza: queda garantizar la palabra entera.
  const byWord = usable / (metrics.longest * k);
  if (byWord >= 1) return { scale: 1, overflows: false, fitsLines: false };
  if (byWord < minScale) return { scale: minScale, overflows: true, fitsLines: false };
  return { scale: byWord, overflows: false, fitsLines: false };
}
