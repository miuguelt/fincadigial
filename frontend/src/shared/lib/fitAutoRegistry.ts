/**
 * fitAutoRegistry — da de alta en el ajuste todo `.fit-clamp` del documento.
 *
 * `.fit-clamp` es el relevo de la utilidad `truncate`, y son ~195 sitios: casi
 * todos texto plano dentro de celdas, listas y encabezados de diálogo. Envolver
 * cada uno en `<FitText>` habría exigido reestructurar 195 bloques de JSX. Con
 * el registro automático basta con cambiar la clase: el elemento se apunta solo
 * al planificador en cuanto entra en el DOM.
 *
 * Para componentes propios sigue siendo preferible `<FitText>`, que ata el ciclo
 * de vida a React. Esto es para el barrido masivo.
 *
 * Ver docs/estandar-texto-adaptable.md.
 */
import { observeFit, remeasureFit } from './fitScheduler';

const SELECTOR = '.fit-clamp';

/** Suelo de reducción antes de recortar. Más bajo que el general: aquí la
 *  alternativa a encoger no es envolver, es perder texto. */
const CLAMP_MIN_SCALE = 0.62;

const tracked = new WeakMap<Element, () => void>();
let mutationObserver: MutationObserver | null = null;

function register(el: Element) {
  if (!(el instanceof HTMLElement) || tracked.has(el)) return;
  tracked.set(el, observeFit(el, 1, CLAMP_MIN_SCALE, true));
}

function unregister(el: Element) {
  const release = tracked.get(el);
  if (!release) return;
  release();
  tracked.delete(el);
}

function scan(root: Element | Document) {
  if (root instanceof Element && root.matches(SELECTOR)) register(root);
  root.querySelectorAll(SELECTOR).forEach(register);
}

function sweep(nodes: NodeList, visit: (el: Element) => void) {
  nodes.forEach((node) => {
    if (!(node instanceof Element)) return;
    if (node.matches(SELECTOR)) visit(node);
    node.querySelectorAll(SELECTOR).forEach(visit);
  });
}

function handle(records: MutationRecord[]) {
  for (const record of records) {
    if (record.type === 'childList') {
      sweep(record.removedNodes, unregister);
      sweep(record.addedNodes, register);
    }
    // El contenido cambió sin que cambie el ancho: el ResizeObserver no se
    // entera, así que hay que volver a medir a mano. Cubre tanto `characterData`
    // como el `childList` que produce asignar `textContent`, cuyo nodo añadido
    // es texto y no lo ve el barrido de elementos.
    const target =
      record.target instanceof Element ? record.target : record.target.parentElement;
    const owner = target?.closest(SELECTOR);
    if (owner) remeasureFit(owner);
  }
}

/** Arranca el registro automático. Idempotente. */
export function startFitAutoRegistry() {
  if (mutationObserver || typeof MutationObserver === 'undefined') return;
  scan(document);
  mutationObserver = new MutationObserver(handle);
  mutationObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

export function stopFitAutoRegistry() {
  mutationObserver?.disconnect();
  mutationObserver = null;
}
